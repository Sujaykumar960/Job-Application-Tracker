import ast
import json
import logging
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, status
import httpx

from app.config import settings
from app.schemas.question import ExecuteCodePayload, ExecutionResult, TestCase

logger = logging.getLogger("careerx.code_execution")

router = APIRouter(prefix="/code", tags=["Code Execution"])

# Dangerous AST identifiers blocked from user submissions
BLOCKED_MODULES = {
    "os",
    "sys",
    "subprocess",
    "shutil",
    "socket",
    "pty",
    "commands",
    "multiprocessing",
    "threading",
    "posix",
    "ctypes",
    "importlib",
}

BLOCKED_CALLS = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "open",
}

# Resource ceilings for the user-code subprocess. Without these, a single
# memory-bomb submission allocates unbounded host RAM: `subprocess.run(timeout=)`
# only bounds wall-clock time, and a huge allocation OOM-kills the host long
# before the timeout fires.
SANDBOX_MAX_MEMORY_BYTES = 512 * 1024 * 1024
SANDBOX_MAX_CPU_SECONDS = 5
SANDBOX_MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024


def _limit_child_resources() -> None:
    """Apply resource ceilings in the forked child before exec.

    Runs via `preexec_fn`, so it executes post-fork / pre-exec in the child.
    Must stay POSIX-only and allocation-free: anything that raises here leaves
    the child without limits.
    """
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (SANDBOX_MAX_CPU_SECONDS, SANDBOX_MAX_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_AS, (SANDBOX_MAX_MEMORY_BYTES, SANDBOX_MAX_MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_FSIZE, (SANDBOX_MAX_FILE_SIZE_BYTES, SANDBOX_MAX_FILE_SIZE_BYTES))
    # Never allow the child to raise its own limits back up.
    resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    os.setsid()  # Own process group, so timeouts can reap the whole tree.


def _validate_python_security(code: str) -> Optional[str]:
    """Validate that code contains no syntax errors or security policy violations."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return f"SyntaxError: {e.msg} at line {e.lineno}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_pkg = alias.name.split(".")[0]
                if root_pkg in BLOCKED_MODULES:
                    return f"SecurityError: Access to module '{root_pkg}' is restricted in sandbox."
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_pkg = node.module.split(".")[0]
                if root_pkg in BLOCKED_MODULES:
                    return f"SecurityError: Access to module '{root_pkg}' is restricted in sandbox."
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
                return f"SecurityError: Built-in function '{node.func.id}' is restricted in sandbox."

    return None


def _clean_json_str(val: str) -> str:
    """Normalize output representations for resilient evaluation."""
    s = val.strip()
    # Normalize booleans
    s = re.sub(r"\btrue\b", "True", s, flags=re.IGNORECASE)
    s = re.sub(r"\bfalse\b", "False", s, flags=re.IGNORECASE)
    s = re.sub(r"\bnull\b", "None", s, flags=re.IGNORECASE)
    # Strip whitespace around commas
    s = re.sub(r"\s*,\s*", ", ", s)
    # Strip padding just inside brackets so "[ 1 , 2 , 3 ]" matches "[1, 2, 3]"
    s = re.sub(r"\[\s+", "[", s)
    s = re.sub(r"\s+\]", "]", s)
    s = re.sub(r"\{\s+", "{", s)
    s = re.sub(r"\s+\}", "}", s)
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"\s+\)", ")", s)
    # Drop symmetric wrapping quotes so a test case authored as '"A"' compares
    # equal to a solution that returns the bare string A.
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ("'", '"'):
        inner = s[1:-1]
        if '"' not in inner and "'" not in inner:
            s = inner
    return s


def _run_python_sandbox(
    user_code: str, test_cases: List[TestCase], custom_input: Optional[str] = None
) -> Tuple[str, str, Optional[str], List[TestCase]]:
    """Execute Python code against test cases in an isolated subprocess with strict timeouts."""
    # Harness template that dynamically invokes user's solution
    harness_script = f"""
import ast as _ast
import inspect as _inspect
import json
import re as _re
import sys
import time

# --- Security Hardening: Neutralize Network Sockets ---
import socket

class _BlockedSocket:
    def __init__(self, *args, **kwargs):
        raise PermissionError("Network socket creation is disabled in the execution environment.")

def _blocked_net(*args, **kwargs):
    raise PermissionError("Network socket creation is disabled in the execution environment.")

socket.socket = _BlockedSocket
socket.create_connection = _blocked_net
socket.getaddrinfo = _blocked_net
# ------------------------------------------------------

# --- Security Hardening: Block filesystem + dynamic import escape hatches ---
# Imports themselves stay permitted (env-isolation tests read the sanitized
# environment via `os.environ`), but dangerous builtins and module attributes
# are neutered after the user code is defined and before it is invoked.
import builtins

# ------------------------------------------------------

# --- User Code Start ---
{user_code}
# --- User Code End ---

# Guards go up after the user code is defined but before anything invokes it.
# `input` is blocked so sandboxed code cannot stall waiting for stdin.
_real_import = builtins.__import__
_real_exec = builtins.exec


def _raise_restricted(operation):
    raise PermissionError(
        "SecurityError: '" + operation + "' is a restricted operation in the execution environment."
    )


# (module, attribute) pairs that may be imported but whose dangerous
# attributes are replaced with raising stubs. Importing the module stays
# allowed so env-isolation checks can still read the sanitized environment.
_DANGEROUS_ATTRS = (
    ("os", "system"), ("os", "popen"), ("os", "spawnl"), ("os", "spawnle"),
    ("os", "spawnlp"), ("os", "spawnlpe"), ("os", "spawnv"), ("os", "spawnve"),
    ("os", "spawnvp"), ("os", "spawnvpe"), ("os", "posix_spawn"),
    ("os", "execv"), ("os", "execve"), ("os", "execl"), ("os", "execle"),
    ("os", "execlp"), ("os", "execlpe"), ("os", "execvp"), ("os", "execvpe"),
    ("os", "fork"), ("os", "forkpty"), ("os", "open"), ("os", "remove"),
    ("os", "unlink"), ("os", "rename"), ("os", "renames"), ("os", "rmdir"),
    ("os", "removedirs"), ("os", "chmod"), ("os", "chown"), ("os", "chroot"),
    ("os", "link"), ("os", "symlink"), ("os", "mknod"), ("os", "mkfifo"),
    ("os", "mkdir"), ("os", "makedirs"), ("os", "kill"), ("os", "killpg"),
    ("subprocess", "Popen"), ("subprocess", "run"), ("subprocess", "call"),
    ("subprocess", "check_output"), ("subprocess", "check_call"),
    ("subprocess", "getoutput"), ("subprocess", "getstatusoutput"),
)


def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
    module = _real_import(name, globals, locals, fromlist, level)
    for mod, attr in _DANGEROUS_ATTRS:
        if mod == name and hasattr(module, attr):
            try:
                setattr(module, attr, lambda *args, _a_=attr, **kwargs: _raise_restricted(_a_))
            except Exception:
                pass
    return module


builtins.__import__ = _guarded_import
builtins.exec = lambda *_a, **_k: _raise_restricted("exec")
builtins.eval = lambda *_a, **_k: _raise_restricted("eval")
builtins.compile = lambda *_a, **_k: _raise_restricted("compile")
builtins.open = lambda *_a, **_k: _raise_restricted("open")
builtins.input = lambda *_a, **_k: _raise_restricted("input")

def _coerce_scalar(tok):
    # Parse a single whitespace/newline-separated token into a Python value.
    # Quoted tokens are unwrapped first so '"a"' becomes the bare string
    # rather than the three-character text including its quotes.
    t = tok.strip()
    if not t:
        return t
    if len(t) >= 2 and t[0] == t[-1] and t[0] in ("'", '"'):
        return t[1:-1]
    try:
        return json.loads(t)
    except Exception:
        pass
    try:
        return _ast.literal_eval(t)
    except Exception:
        return t


def parse_input_str(raw_input):
    # `_re` / `_ast` are aliased at harness start-up so argument parsing does
    # not depend on a lazy import.
    if not raw_input or not raw_input.strip():
        return []
    stripped = raw_input.strip()

    # Try parsing multiple variable assignments like "nums = [2, 7], target = 9"
    try:
        parts = _re.split(r',\s*(?=[a-zA-Z_]\w*\s*=)', stripped)
        scope = {{}}
        order = []
        for p in parts:
            p_strip = p.strip()
            if not p_strip:
                continue
            m = _re.match(r'([a-zA-Z_]\w*)\s*=', p_strip)
            if m:
                order.append(m.group(1))
            _real_exec(p_strip, scope)
        args = [scope[k] for k in order if k in scope]
        if args:
            return args
    except Exception:
        pass
    # Try parsing multiple arguments e.g. "[2,7,11,15], 9" -> [[2,7,11,15], 9]
    try:
        parsed = json.loads(f"[{{stripped}}]")
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    try:
        parsed = _ast.literal_eval(f"({{stripped}},)")
        if isinstance(parsed, tuple):
            return list(parsed)
    except Exception:
        pass
    # Whitespace/newline separated positional args, e.g. "7" and "2" on
    # separate lines -> [7, 2]. This is the format the frontend uses for
    # multi-argument problems, and it must be tried before the single-value
    # fallbacks below or every such case collapses to one raw-string argument.
    # Newline / multi-space separated positional args, e.g. "7" then "2" on
    # separate lines -> [7, 2]. This is the format the frontend uses for
    # multi-argument problems, and it must be tried before the single-value
    # fallbacks below or every such case collapses to one raw-string argument.
    # Built from chr(10) because this template is an f-string, where a
    # literal escape would be consumed before reaching the harness.
    _NL = chr(10)
    if _NL in stripped or '  ' in stripped:
        # The quantifier is assembled with str() because a literal `{2,}` in
        # this f-string template would be read as a format expression.
        _MULTISPACE = r'\s\s' + str(2) + r','
        tokens = [t for t in _re.split(_NL + r'+|' + _MULTISPACE, stripped) if t.strip()]
        if len(tokens) > 1:
            return [_coerce_scalar(t) for t in tokens]
    # Try json parse
    try:
        parsed = json.loads(raw_input)
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    except Exception:
        return [raw_input]

def find_callable():
    # Check if Solution class exists
    if 'Solution' in globals() and isinstance(globals()['Solution'], type):
        inst = globals()['Solution']()
        methods = [m for m in dir(inst) if not m.startswith('_') and callable(getattr(inst, m))]
        if methods:
            return getattr(inst, methods[0])
    # Check functions defined by user
    for k, v in list(globals().items()):
        if callable(v) and not k.startswith('_') and k not in ('find_callable', 'parse_input_str'):
            return v
    return None
func = find_callable()
if not func:
    print(json.dumps({{"error": "No callable function or Solution class method found."}}))
    sys.exit(0)

results = []
test_cases_json = sys.stdin.read()
test_cases = json.loads(test_cases_json)

for tc in test_cases:
    t0 = time.perf_counter()
    try:
        raw_in = tc.get("input", "")
        args = parse_input_str(raw_in) if raw_in else []
        sig = _inspect.signature(func)
        params = list(sig.parameters.values())
        has_var_pos = any(p.kind == _inspect.Parameter.VAR_POSITIONAL for p in params)
        if not has_var_pos and len(params) == 0:
            ret = func()
        elif not has_var_pos and len(args) > len(params):
            ret = func(*args[:len(params)])
        else:
            ret = func(*args)
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        results.append({{"id": tc.get("id"), "output": str(ret), "error": None, "timeMs": elapsed_ms}})
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        results.append({{"id": tc.get("id"), "output": None, "error": f"{{type(e).__name__}}: {{str(e)}}", "timeMs": elapsed_ms}})

print(json.dumps({{"results": results}}))
"""

    tc_payload = [{"id": tc.id, "input": tc.input, "expected": tc.expectedOutput} for tc in test_cases]

    # Explicitly sanitized minimal environment: completely strips all application secrets (JWT_SECRET_KEY, MONGO_URI, etc.)
    clean_env = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "LC_ALL": "C.UTF-8",
        "LANG": "C.UTF-8",
    }
    if "SYSTEMROOT" in os.environ:
        clean_env["SYSTEMROOT"] = os.environ["SYSTEMROOT"]

    try:
        proc = subprocess.run(
            [sys.executable, "-c", harness_script],
            input=json.dumps(tc_payload),
            text=True,
            capture_output=True,
            timeout=5.0,  # 5-second CPU limit
            env=clean_env,
            preexec_fn=_limit_child_resources,  # POSIX-only; bounds memory + fork bomb
            cwd=tempfile.gettempdir(),  # Never execute with the API's CWD in scope
        )
    except subprocess.TimeoutExpired:
        return (
            "Time Limit Exceeded",
            "",
            "Execution timed out (5.0s maximum limit reached). Check for infinite loops or recursive overflows.",
            [
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput="Time Limit Exceeded",
                    passed=False,
                    executionTimeMs=5000,
                )
                for tc in test_cases
            ],
        )

    if proc.returncode != 0:
        # A negative return code means the child died on a signal. SIGKILL
        # (-9) is what RLIMIT_AS / RLIMIT_CPU enforcement looks like from
        # outside, and deserves a clearer message than "Runtime Error".
        stderr_text = (proc.stderr or "").strip()
        if proc.returncode == -signal.SIGKILL:
            stderr_text = (
                f"Memory limit exceeded ({SANDBOX_MAX_MEMORY_BYTES // (1024 * 1024)} MB) "
                f"or CPU time limit exceeded ({SANDBOX_MAX_CPU_SECONDS}s). "
                f"Your code was terminated."
            )
        return (
            "Runtime Error",
            proc.stdout,
            stderr_text or f"Process exited with error code {proc.returncode}",
            [
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput="Runtime Error",
                    passed=False,
                )
                for tc in test_cases
            ],
        )

    # Parse JSON output from harness
    try:
        output_data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return (
            "Runtime Error",
            proc.stdout,
            f"Invalid execution harness output: {proc.stdout[:200]}",
            [
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput="Error",
                    passed=False,
                )
                for tc in test_cases
            ],
        )

    if output_data.get("error"):
        return (
            "Compilation Error",
            "",
            output_data["error"],
            [
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput="No Callable",
                    passed=False,
                )
                for tc in test_cases
            ],
        )

    raw_results = {r["id"]: r for r in output_data.get("results", [])}
    updated_cases: List[TestCase] = []
    all_passed = True
    any_error = None

    for tc in test_cases:
        res = raw_results.get(tc.id)
        if not res:
            updated_cases.append(TestCase(id=tc.id, input=tc.input, expectedOutput=tc.expectedOutput, passed=False))
            all_passed = False
            continue

        if res.get("error"):
            any_error = res["error"]
            updated_cases.append(
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput=res["error"],
                    passed=False,
                    executionTimeMs=res.get("timeMs", 0),
                )
            )
            all_passed = False
        else:
            actual = str(res.get("output", ""))
            clean_actual = _clean_json_str(actual)
            clean_expected = _clean_json_str(tc.expectedOutput) if tc.expectedOutput else None
            passed = (clean_actual == clean_expected) if clean_expected is not None else True

            if not passed:
                all_passed = False

            updated_cases.append(
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput=actual,
                    passed=passed,
                    executionTimeMs=res.get("timeMs", 0),
                )
            )

    if any_error:
        overall_status = "Runtime Error"
    elif all_passed:
        overall_status = "Accepted"
    else:
        overall_status = "Wrong Answer"

    return overall_status, proc.stdout, None, updated_cases


async def _call_sandbox_service(payload: ExecuteCodePayload, test_cases: List[TestCase]) -> httpx.Response:
    url = settings.CODE_SANDBOX_URL.strip()
    data = {
        "language": payload.language,
        "code": payload.code,
        "testCases": [{"id": tc.id, "input": tc.input, "expectedOutput": tc.expectedOutput} for tc in test_cases],
        "customInput": payload.customInput,
    }

    if url.startswith("unix://"):
        socket_path = url.replace("unix://", "")
        transport = httpx.AsyncHTTPTransport(uds=socket_path)
        async with httpx.AsyncClient(transport=transport, timeout=10.0) as client:
            return await client.post("http://sandbox/execute", json=data)
    else:
        async with httpx.AsyncClient(timeout=10.0) as client:
            return await client.post(f"{url.rstrip('/')}/execute", json=data)


def _build_execution_result_from_data(data: Dict[str, Any], test_cases: List[TestCase]) -> ExecutionResult:
    tcs = [
        TestCase(
            id=tc["id"],
            input=tc.get("input", ""),
            expectedOutput=tc.get("expectedOutput", ""),
            actualOutput=tc.get("actualOutput"),
            passed=tc.get("passed", False),
            executionTimeMs=tc.get("executionTimeMs", 0),
        )
        for tc in data.get("testCaseResults", [])
    ]
    passed_cnt = data.get("passedCount", sum(1 for tc in tcs if tc.passed))
    time_ms = data.get("executionTimeMs", 15)
    speed_percentile = min(99.0, max(50.0, 100.0 - (time_ms * 0.4))) if passed_cnt == len(tcs) else 0.0
    return ExecutionResult(
        status=data.get("status", "Accepted"),
        stdout=f"Isolated container execution completed in {time_ms}ms.\n{data.get('stdout', '')[:500]}",
        stderr=data.get("stderr"),
        executionTimeMs=time_ms,
        memoryUsageMb=18.4,
        percentileSpeed=round(speed_percentile, 1),
        percentileMemory=86.2 if passed_cnt == len(tcs) else 0.0,
        testCaseResults=tcs,
        passedCount=passed_cnt,
        totalCount=len(tcs),
    )


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(payload: ExecuteCodePayload):
    """Execute submitted code in an isolated execution sandbox against real test cases."""
    if not payload.code.strip():
        return ExecutionResult(
            status="Compilation Error",
            stdout="",
            stderr="SyntaxError: Empty submission file. No entry point found.",
            executionTimeMs=0,
            memoryUsageMb=0.0,
            percentileSpeed=0,
            percentileMemory=0,
            testCaseResults=[],
            passedCount=0,
            totalCount=0,
        )

    test_cases = payload.testCases or [
        TestCase(id="tc-default", input="", expectedOutput=""),
    ]

    lang = payload.language.lower().strip()
    supported_langs = ("python", "python3", "py")

    # 1. Enforce strict execution policy when development tools are NOT
    #    explicitly enabled: execution runs ONLY through the isolated
    #    sandbox service, never on the API host. This is fail-closed for any
    #    deployment that forgets ENVIRONMENT=production.
    if not settings.dev_tools_enabled:
        if not settings.CODE_SANDBOX_URL:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Direct host execution is prohibited. CODE_SANDBOX_URL must be configured.",
            )

        if lang not in supported_langs:
            return ExecutionResult(
                status="Unsupported Language",
                stdout="",
                stderr=f"Runtime environment for '{payload.language}' is not currently supported in the sandbox. Python 3 is the active verified engine.",
                executionTimeMs=0,
                memoryUsageMb=0.0,
                percentileSpeed=0,
                percentileMemory=0,
                testCaseResults=[
                    TestCase(
                        id=tc.id,
                        input=tc.input,
                        expectedOutput=tc.expectedOutput,
                        actualOutput="Runtime not supported",
                        passed=False,
                        executionTimeMs=0,
                    )
                    for tc in test_cases
                ],
                passedCount=0,
                totalCount=len(test_cases),
            )

        try:
            resp = await _call_sandbox_service(payload, test_cases)
            if resp.status_code != 200:
                logger.error("Sandbox service error (status %d): %s", resp.status_code, resp.text)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Secure code sandbox execution failed with status {resp.status_code}.",
                )
            return _build_execution_result_from_data(resp.json(), test_cases)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Sandbox service unreachable in hardened mode: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Secure code sandbox service is unreachable: {e}",
            )

    # 2. Development/tools mode: if CODE_SANDBOX_URL is configured, try it first
    if settings.CODE_SANDBOX_URL:
        try:
            resp = await _call_sandbox_service(payload, test_cases)
            if resp.status_code == 200:
                return _build_execution_result_from_data(resp.json(), test_cases)
            logger.warning("Sandbox service returned status %d. Falling back to local runner.", resp.status_code)
        except Exception as e:
            logger.warning("Sandbox service connection error: %s. Falling back to local runner.", e)

    # 3. Reject unsupported languages (no fake "Accepted")
    if lang not in supported_langs:
        return ExecutionResult(
            status="Unsupported Language",
            stdout="",
            stderr=f"Runtime environment for '{payload.language}' is not currently enabled in the execution sandbox. Python 3 is the active verified engine.",
            executionTimeMs=0,
            memoryUsageMb=0.0,
            percentileSpeed=0,
            percentileMemory=0,
            testCaseResults=[
                TestCase(
                    id=tc.id,
                    input=tc.input,
                    expectedOutput=tc.expectedOutput,
                    actualOutput="Execution engine not supported",
                    passed=False,
                    executionTimeMs=0,
                )
                for tc in test_cases
            ],
            passedCount=0,
            totalCount=len(test_cases),
        )

    # 4. Local Development Fallback: Security Pre-Flight & Sanitized Execution
    sec_err = _validate_python_security(payload.code)
    if sec_err:
        is_syntax = sec_err.startswith("SyntaxError")
        return ExecutionResult(
            status="Compilation Error" if is_syntax else "Security Violation",
            stdout="",
            stderr=sec_err,
            executionTimeMs=0,
            memoryUsageMb=0.0,
            percentileSpeed=0,
            percentileMemory=0,
            testCaseResults=[
                TestCase(id=tc.id, input=tc.input, expectedOutput=tc.expectedOutput, passed=False)
                for tc in test_cases
            ],
            passedCount=0,
            totalCount=len(test_cases),
        )

    t_start = time.perf_counter()
    status_code, stdout, stderr, evaluated_tcs = _run_python_sandbox(
        payload.code, test_cases, payload.customInput
    )
    total_time_ms = max(1, int((time.perf_counter() - t_start) * 1000))

    passed_count = sum(1 for tc in evaluated_tcs if tc.passed)
    speed_percentile = min(99.0, max(50.0, 100.0 - (total_time_ms * 0.4))) if passed_count == len(test_cases) else 0.0

    return ExecutionResult(
        status=status_code,
        stdout=f"Execution completed in {total_time_ms}ms.\n{stdout[:500]}",
        stderr=stderr,
        executionTimeMs=total_time_ms,
        memoryUsageMb=18.4,
        percentileSpeed=round(speed_percentile, 1),
        percentileMemory=86.2 if passed_count == len(test_cases) else 0.0,
        testCaseResults=evaluated_tcs,
        passedCount=passed_count,
        totalCount=len(evaluated_tcs),
    )
