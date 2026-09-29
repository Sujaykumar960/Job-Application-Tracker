"""
CareerX Isolated Code Execution Sandbox Runner
----------------------------------------------
A lightweight, isolated microservice designed to run inside an unprivileged,
network-disabled container (non-root, read-only FS, resource-bounded).

Receives execution requests, executes code in a dedicated subprocess with
a completely stripped environment (no application secrets, no host access),
and returns structured test case execution results.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional, Tuple


# Resource ceilings applied to every execution subprocess. The container is
# already bounded (mem_limit, pids_limit, cpus in compose), but those are
# enforced by the kernel for the *container*; these bound the individual
# child so one submission cannot exhaust the shared sandbox budget and deny
# service to every other user.
SANDBOX_MAX_MEMORY_BYTES = 512 * 1024 * 1024
SANDBOX_MAX_CPU_SECONDS = 5
SANDBOX_MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024


def _limit_child_resources() -> None:
    """Apply resource ceilings in the forked child before exec.

    Runs via `preexec_fn` (post-fork / pre-exec). Must stay POSIX-only and
    allocation-free.

    Fails closed. An unbounded child can exhaust the shared sandbox budget and
    deny service to every other user, so a child that cannot be bounded is
    never allowed to exec.
    """
    import resource

    # Own process group first, and independently of the ceilings below: timeout
    # reaping signals the whole tree via the group id, so this must still happen
    # when a later ceiling is rejected.
    os.setsid()

    # Hard ceilings. A host that refuses these leaves the child unrunnable.
    resource.setrlimit(resource.RLIMIT_CPU, (SANDBOX_MAX_CPU_SECONDS, SANDBOX_MAX_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_AS, (SANDBOX_MAX_MEMORY_BYTES, SANDBOX_MAX_MEMORY_BYTES))

    # Best-effort ceilings. Some hosts forbid lowering these, and the hard
    # limits above already bound the child, so degrade instead of aborting.
    for limit, ceiling in (
        (resource.RLIMIT_FSIZE, SANDBOX_MAX_FILE_SIZE_BYTES),
        (resource.RLIMIT_NPROC, 64),
    ):
        try:
            resource.setrlimit(limit, (ceiling, ceiling))
        except (ValueError, OSError):
            pass


def _clean_json_str(val: str) -> str:
    """Normalize output representations for resilient evaluation."""
    s = val.strip()
    s = re.sub(r"\btrue\b", "True", s, flags=re.IGNORECASE)
    s = re.sub(r"\bfalse\b", "False", s, flags=re.IGNORECASE)
    s = re.sub(r"\bnull\b", "None", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*,\s*", ", ", s)
    return s


def execute_python_in_sandbox(
    user_code: str, test_cases: List[Dict[str, Any]], custom_input: Optional[str] = None
) -> Dict[str, Any]:
    """Execute Python code against test cases with isolated environment and timeouts."""
    harness_script = f"""
import json
import sys
import time

# --- Sandbox Security Hardening: Neutralize Network Sockets ---
import socket

class _BlockedSocket:
    def __init__(self, *args, **kwargs):
        raise PermissionError("Network socket creation is disabled inside this sandbox environment.")

def _blocked_net(*args, **kwargs):
    raise PermissionError("Network socket creation is disabled inside this sandbox environment.")

socket.socket = _BlockedSocket
socket.create_connection = _blocked_net
socket.getaddrinfo = _blocked_net
# -------------------------------------------------------------

# --- User Code Start ---
{user_code}
# --- User Code End ---

# Guards go up after the user code is defined but before anything invokes it.
import builtins
_real_import = builtins.__import__
_real_exec = builtins.exec


def _raise_restricted(operation):
    raise PermissionError(
        "SecurityError: '" + operation + "' is a restricted operation in the execution environment."
    )


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

def parse_input_str(raw_input):
    import re
    try:
        parts = re.split(r',\\s*(?=[a-zA-Z_]\\w*\\s*=)', str(raw_input).strip())
        scope = {{}}
        order = []
        for p in parts:
            p_strip = p.strip()
            if not p_strip:
                continue
            m = re.match(r'([a-zA-Z_]\\w*)\\s*=', p_strip)
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
        parsed = json.loads(f"[{{str(raw_input).strip()}}]")
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    try:
        import ast
        parsed = ast.literal_eval(f"({{str(raw_input).strip()}},)")
        if isinstance(parsed, tuple):
            return list(parsed)
    except Exception:
        pass
    try:
        parsed = json.loads(str(raw_input))
        if isinstance(parsed, list):
            return parsed
        return [parsed]
    except Exception:
        return [raw_input]

def find_callable():
    if 'Solution' in globals() and isinstance(globals()['Solution'], type):
        inst = globals()['Solution']()
        methods = [m for m in dir(inst) if not m.startswith('_') and callable(getattr(inst, m))]
        if methods:
            return getattr(inst, methods[0])
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
        import inspect
        sig = inspect.signature(func)
        params = list(sig.parameters.values())
        has_var_pos = any(p.kind == inspect.Parameter.VAR_POSITIONAL for p in params)
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

    tc_payload = [{"id": tc.get("id"), "input": tc.get("input"), "expected": tc.get("expectedOutput")} for tc in test_cases]

    # Completely clean execution environment: ZERO application secrets
    clean_env = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "LC_ALL": "C.UTF-8",
        "LANG": "C.UTF-8",
    }
    if "SYSTEMROOT" in os.environ:
        clean_env["SYSTEMROOT"] = os.environ["SYSTEMROOT"]

    extra_kwargs = {}
    if sys.platform != "win32":
        extra_kwargs["preexec_fn"] = _limit_child_resources

    try:
        proc = subprocess.run(
            [sys.executable, "-c", harness_script],
            input=json.dumps(tc_payload),
            text=True,
            capture_output=True,
            timeout=5.0,
            env=clean_env,
            cwd=tempfile.gettempdir(),
            **extra_kwargs,
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "Time Limit Exceeded",
            "stdout": "",
            "stderr": "Execution timed out (5.0s maximum limit reached).",
            "executionTimeMs": 5000,
            "testCaseResults": [
                {
                    "id": tc.get("id"),
                    "input": tc.get("input"),
                    "expectedOutput": tc.get("expectedOutput"),
                    "actualOutput": "Time Limit Exceeded",
                    "passed": False,
                    "executionTimeMs": 5000,
                }
                for tc in test_cases
            ],
            "passedCount": 0,
            "totalCount": len(test_cases),
        }

    except subprocess.SubprocessError as exc:
        # The child never reached exec: resource ceilings could not be applied.
        # Refuse the submission rather than run it unbounded.
        return {
            "status": "Runtime Error",
            "stdout": "",
            "stderr": f"Sandbox refused to start: {type(exc).__name__}: {exc}",
            "executionTimeMs": 0,
            "testCaseResults": [
                {
                    "id": tc.get("id"),
                    "input": tc.get("input"),
                    "expectedOutput": tc.get("expectedOutput"),
                    "actualOutput": "Runtime Error",
                    "passed": False,
                    "executionTimeMs": 0,
                }
                for tc in test_cases
            ],
            "passedCount": 0,
            "totalCount": len(test_cases),
        }

    if proc.returncode != 0:
        return {
            "status": "Runtime Error",
            "stdout": proc.stdout,
            "stderr": proc.stderr.strip() or f"Process exited with error code {proc.returncode}",
            "testCaseResults": [
                {
                    "id": tc.get("id"),
                    "input": tc.get("input"),
                    "expectedOutput": tc.get("expectedOutput"),
                    "actualOutput": "Runtime Error",
                    "passed": False,
                }
                for tc in test_cases
            ],
            "passedCount": 0,
            "totalCount": len(test_cases),
        }

    try:
        output_data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {
            "status": "Runtime Error",
            "stdout": proc.stdout,
            "stderr": f"Invalid output from sandbox: {proc.stdout[:200]}",
            "testCaseResults": [
                {
                    "id": tc.get("id"),
                    "input": tc.get("input"),
                    "expectedOutput": tc.get("expectedOutput"),
                    "actualOutput": "Error",
                    "passed": False,
                }
                for tc in test_cases
            ],
            "passedCount": 0,
            "totalCount": len(test_cases),
        }

    if output_data.get("error"):
        return {
            "status": "Compilation Error",
            "stdout": "",
            "stderr": output_data["error"],
            "testCaseResults": [
                {
                    "id": tc.get("id"),
                    "input": tc.get("input"),
                    "expectedOutput": tc.get("expectedOutput"),
                    "actualOutput": "No Callable",
                    "passed": False,
                }
                for tc in test_cases
            ],
            "passedCount": 0,
            "totalCount": len(test_cases),
        }

    raw_results = {r["id"]: r for r in output_data.get("results", [])}
    evaluated_tcs = []
    all_passed = True
    any_error = None

    for tc in test_cases:
        tc_id = tc.get("id")
        res = raw_results.get(tc_id)
        if not res:
            evaluated_tcs.append({
                "id": tc_id,
                "input": tc.get("input"),
                "expectedOutput": tc.get("expectedOutput"),
                "actualOutput": "Missing",
                "passed": False,
            })
            all_passed = False
            continue

        if res.get("error"):
            any_error = res["error"]
            evaluated_tcs.append({
                "id": tc_id,
                "input": tc.get("input"),
                "expectedOutput": tc.get("expectedOutput"),
                "actualOutput": res["error"],
                "passed": False,
                "executionTimeMs": res.get("timeMs", 0),
            })
            all_passed = False
        else:
            actual = str(res.get("output", ""))
            clean_actual = _clean_json_str(actual)
            exp_raw = tc.get("expectedOutput")
            clean_expected = _clean_json_str(str(exp_raw)) if exp_raw else None
            passed = (clean_actual == clean_expected) if clean_expected is not None else True
            if not passed:
                all_passed = False

            evaluated_tcs.append({
                "id": tc_id,
                "input": tc.get("input"),
                "expectedOutput": tc.get("expectedOutput"),
                "actualOutput": actual,
                "passed": passed,
                "executionTimeMs": res.get("timeMs", 0),
            })

    status_str = "Runtime Error" if any_error else ("Accepted" if all_passed else "Wrong Answer")
    passed_count = sum(1 for tc in evaluated_tcs if tc["passed"])

    return {
        "status": status_str,
        "stdout": proc.stdout[:500],
        "stderr": any_error,
        "executionTimeMs": sum(tc.get("executionTimeMs", 0) for tc in evaluated_tcs),
        "testCaseResults": evaluated_tcs,
        "passedCount": passed_count,
        "totalCount": len(evaluated_tcs),
    }


class SandboxHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/health", "/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"healthy","service":"careerx-code-sandbox"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path != "/execute":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 100000:
            self.send_response(413)
            self.end_headers()
            self.wfile.write(b'{"error":"Payload too large"}')
            return

        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except Exception:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"Invalid JSON"}')
            return

        user_code = data.get("code", "")
        test_cases = data.get("testCases", [])
        custom_input = data.get("customInput")

        result = execute_python_in_sandbox(user_code, test_cases, custom_input)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode("utf-8"))

    def log_message(self, format, *args):
        # Suppress noisy standard HTTP access logs
        pass


class UnixHTTPServer(HTTPServer):
    address_family = getattr(socket, "AF_UNIX", socket.AF_INET)

    def server_bind(self):
        super().server_bind()
        self.server_address = self.socket.getsockname()


def run_server():
    socket_path = os.environ.get("SANDBOX_SOCKET_PATH")
    if socket_path and hasattr(socket, "AF_UNIX"):
        if os.path.exists(socket_path):
            try:
                os.unlink(socket_path)
            except OSError:
                pass
        os.makedirs(os.path.dirname(socket_path), exist_ok=True)
        server = UnixHTTPServer(socket_path, SandboxHandler)
        socket_mode_str = os.environ.get("SANDBOX_SOCKET_MODE", "0660")
        try:
            mode = int(socket_mode_str, 8)
            os.chmod(socket_path, mode)
        except (ValueError, OSError):
            try:
                os.chmod(socket_path, 0o660)
            except OSError:
                pass
        print(f"CareerX Code Sandbox listening on Unix domain socket: {socket_path} (mode={socket_mode_str})")
    else:
        port = int(os.environ.get("SANDBOX_PORT", 2000))
        server = HTTPServer(("0.0.0.0", port), SandboxHandler)
        print(f"CareerX Code Sandbox listening on TCP port {port}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        if socket_path and os.path.exists(socket_path):
            try:
                os.unlink(socket_path)
            except OSError:
                pass


if __name__ == "__main__":
    run_server()
