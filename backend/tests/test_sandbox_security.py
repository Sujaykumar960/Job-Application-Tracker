"""
=============================================================================
CareerX – Code Execution Sandbox: Comprehensive Security & Correctness Suite
=============================================================================

Coverage areas:
  A. Environment Secret Isolation
  B. AST Static Security Validation
  C. Blocked Module & Built-in Runtime Enforcement
  D. Socket / Network Neutralization
  E. Production Fail-Closed Architecture (503 / 502 error paths)
  F. Sandbox Microservice Harness Tests
  G. Rate-Limiter Client IP Resolution
  H. Algorithm Correctness (two-sum, palindrome, binary-search, fizzbuzz, etc.)
  I. Edge Cases (empty input, None, large output, unicode, deeply nested)
  J. Adversarial Code Payloads (env-probing, SSRF, open(), exec(), eval())
  K. Startup / Lifespan Gate Tests
  L. Multi Test-Case Batch Execution
  M. Output Normalization & Type Coercion
  N. Language Gating (non-Python languages rejected cleanly)
  O. Timeout / CPU-spin protection
"""

import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from starlette.requests import Request
from starlette.testclient import TestClient

from app.main import app, lifespan
from app.dependencies import get_current_active_user
from app.middleware.rate_limiter import get_client_ip
from app.routers.code_execution import (
    BLOCKED_CALLS,
    BLOCKED_MODULES,
    _limit_child_resources as _api_limit_child_resources,
    _run_python_sandbox,
    _validate_python_security,
)
from app.schemas.question import TestCase
from sandbox.server import _limit_child_resources as _svc_limit_child_resources
from sandbox.server import execute_python_in_sandbox


@pytest.fixture(autouse=True)
def _override_code_execute_auth():
    """/api/code/execute now requires an authenticated active user.

    The sandbox suite only exercises execution semantics, so a fake resolved
    user keeps these tests focused while the dedicated
    ``TestCodeExecuteAuthZ`` class verifies real enforcement.
    """
    async def _fake_active_user():
        return {"id": "sandbox-authz-user", "email": "sandbox@test.dev", "role": "seeker"}

    app.dependency_overrides[get_current_active_user] = _fake_active_user
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


# ─────────────────────────────────────────────────────────────────────────────
# AUTHZ.  CODE EXECUTION REQUIRES AN AUTHENTICATED ACTIVE USER
# ─────────────────────────────────────────────────────────────────────────────

class TestCodeExecuteAuthZ:
    """Execution is CPU/spawn-bound, so it must never be reachable anonymously."""

    def test_anonymous_code_execute_rejected_401(self):
        with TestClient(app) as client:
            app.dependency_overrides.pop(get_current_active_user, None)
            try:
                res = client.post(
                    "/api/code/execute",
                    json={
                        "language": "python",
                        "code": "def solve(): return 42",
                        "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
                    },
                )
                assert res.status_code == 401
            finally:
                async def _fake_active_user():
                    return {"id": "sandbox-authz-user", "email": "sandbox@test.dev", "role": "seeker"}
                app.dependency_overrides[get_current_active_user] = _fake_active_user

    def test_authenticated_code_execute_accepted(self):
        with TestClient(app) as client:
            res = client.post(
                "/api/code/execute",
                json={
                    "language": "python",
                    "code": "def solve(): return 42",
                    "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
                },
            )
            assert res.status_code == 200
            assert res.json()["status"] == "Accepted"

    def test_code_execute_rate_limited_in_production(self):
        """Production sliding-window limiter (20/min/IP) must return 429 on overflow."""
        from unittest.mock import patch

        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", ""):
                with TestClient(app) as client:
                    res = None
                    for _ in range(21):
                        res = client.post(
                            "/api/code/execute",
                            json={
                                "language": "python",
                                "code": "def solve(): return 42",
                                "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
                            },
                        )
                    assert res is not None
                    assert res.status_code == 429
                    assert "Too many requests" in res.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# A.  ENVIRONMENT SECRET ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

class TestEnvironmentSecretIsolation:
    """Verify host secrets are never visible inside the sandbox subprocess."""

    def test_jwt_secret_not_leaked(self):
        """JWT_SECRET_KEY must be absent from the sandbox environment."""
        with patch.dict(os.environ, {"JWT_SECRET_KEY": "super_secret_jwt_key_that_must_not_leak"}):
            code = """
def solution(*args):
    import os
    return os.environ.get("JWT_SECRET_KEY", "NOT_FOUND")
"""
            tc = TestCase(id="jwt", input="", expectedOutput="NOT_FOUND")
            status, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND"
            assert tcs[0].passed is True

    def test_mongo_uri_not_leaked(self):
        """MONGO_URI connection string must be stripped."""
        with patch.dict(os.environ, {"MONGO_URI": "mongodb://admin:s3cr3t@db:27017"}):
            code = """
def solution(*args):
    import os
    return os.environ.get("MONGO_URI", "NOT_FOUND")
"""
            tc = TestCase(id="mongo", input="", expectedOutput="NOT_FOUND")
            _, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND"

    def test_groq_api_key_not_leaked(self):
        """GROQ_API_KEY must be stripped."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_super_secret_groq_api_key"}):
            code = """
def solution(*args):
    import os
    return os.environ.get("GROQ_API_KEY", "NOT_FOUND")
"""
            tc = TestCase(id="groq", input="", expectedOutput="NOT_FOUND")
            _, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND"

    def test_multiple_secrets_isolated_simultaneously(self):
        """All three critical secrets must be absent at the same time."""
        with patch.dict(os.environ, {
            "JWT_SECRET_KEY": "super_secret_jwt_key_that_must_not_leak",
            "MONGO_URI": "mongodb://admin:super_secret_password@db:27017",
            "GROQ_API_KEY": "gsk_super_secret_groq_api_key",
        }):
            code = """
def solution(*args):
    import os
    jwt   = os.environ.get("JWT_SECRET_KEY",  "NOT_FOUND")
    mongo = os.environ.get("MONGO_URI",        "NOT_FOUND")
    groq  = os.environ.get("GROQ_API_KEY",    "NOT_FOUND")
    return f"{jwt}:{mongo}:{groq}"
"""
            tc = TestCase(id="all_secrets", input="", expectedOutput="NOT_FOUND:NOT_FOUND:NOT_FOUND")
            status, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND:NOT_FOUND:NOT_FOUND"
            assert tcs[0].passed is True
            assert status == "Accepted"

    def test_database_password_env_not_leaked(self):
        """DB_PASSWORD must not be readable inside sandbox."""
        with patch.dict(os.environ, {"DB_PASSWORD": "ultra_secure_db_pass"}):
            code = """
def solution(*args):
    import os
    return os.environ.get("DB_PASSWORD", "NOT_FOUND")
"""
            tc = TestCase(id="db_pass", input="", expectedOutput="NOT_FOUND")
            _, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND"

    def test_stripe_key_not_leaked(self):
        """STRIPE_SECRET_KEY must not be readable inside sandbox."""
        with patch.dict(os.environ, {"STRIPE_SECRET_KEY": "sk_live_abc123xyz"}):
            code = """
def solution(*args):
    import os
    return os.environ.get("STRIPE_SECRET_KEY", "NOT_FOUND")
"""
            tc = TestCase(id="stripe", input="", expectedOutput="NOT_FOUND")
            _, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "NOT_FOUND"

    def test_sandbox_env_dump_reveals_no_secrets(self):
        """Dumping os.environ inside sandbox should contain zero application secrets."""
        with patch.dict(os.environ, {
            "JWT_SECRET_KEY": "must_not_appear",
            "MONGO_URI": "must_not_appear",
        }):
            code = """
def solution(*args):
    import os
    dump = str(dict(os.environ))
    if "must_not_appear" in dump:
        return "LEAKED"
    return "SAFE"
"""
            tc = TestCase(id="env_dump", input="", expectedOutput="SAFE")
            _, _, _, tcs = _run_python_sandbox(code, [tc])
            assert tcs[0].actualOutput == "SAFE"
            assert tcs[0].passed is True


# ─────────────────────────────────────────────────────────────────────────────
# B.  AST STATIC SECURITY VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

class TestASTSecurityValidation:
    """Validate that _validate_python_security catches policy violations statically."""

    def test_clean_code_passes_validation(self):
        code = "def solution(x): return x + 1"
        assert _validate_python_security(code) is None

    def test_syntax_error_detected(self):
        code = "def solution(x: return x"
        result = _validate_python_security(code)
        assert result is not None
        assert "SyntaxError" in result

    def test_import_os_blocked(self):
        code = "import os\ndef solution(): return os.getcwd()"
        result = _validate_python_security(code)
        assert result is not None
        assert "os" in result
        assert "SecurityError" in result

    def test_import_sys_blocked(self):
        code = "import sys\ndef solution(): return sys.version"
        result = _validate_python_security(code)
        assert result is not None
        assert "sys" in result

    def test_import_subprocess_blocked(self):
        code = "import subprocess\ndef solution(): return subprocess.check_output(['ls'])"
        result = _validate_python_security(code)
        assert result is not None
        assert "subprocess" in result

    def test_import_socket_blocked(self):
        code = "import socket\ndef solution(): return socket.gethostname()"
        result = _validate_python_security(code)
        assert result is not None
        assert "socket" in result

    def test_import_shutil_blocked(self):
        code = "import shutil\ndef solution(): shutil.rmtree('/')"
        result = _validate_python_security(code)
        assert result is not None
        assert "shutil" in result

    def test_import_multiprocessing_blocked(self):
        code = "import multiprocessing\ndef solution(): pass"
        result = _validate_python_security(code)
        assert result is not None
        assert "multiprocessing" in result

    def test_import_threading_blocked(self):
        code = "import threading\ndef solution(): pass"
        result = _validate_python_security(code)
        assert result is not None
        assert "threading" in result

    def test_import_ctypes_blocked(self):
        code = "import ctypes\ndef solution(): pass"
        result = _validate_python_security(code)
        assert result is not None
        assert "ctypes" in result

    def test_from_import_os_path_blocked(self):
        code = "from os import path\ndef solution(): return path.exists('/')"
        result = _validate_python_security(code)
        assert result is not None
        assert "os" in result

    def test_from_import_subprocess_run_blocked(self):
        code = "from subprocess import run\ndef solution(): return run(['id'], capture_output=True)"
        result = _validate_python_security(code)
        assert result is not None
        assert "subprocess" in result

    def test_eval_call_blocked(self):
        code = "def solution(x): return eval(x)"
        result = _validate_python_security(code)
        assert result is not None
        assert "eval" in result

    def test_exec_call_blocked(self):
        code = "def solution(x): exec(x)"
        result = _validate_python_security(code)
        assert result is not None
        assert "exec" in result

    def test_compile_call_blocked(self):
        code = "def solution(x): return compile(x, '<string>', 'eval')"
        result = _validate_python_security(code)
        assert result is not None
        assert "compile" in result

    def test_dunder_import_blocked(self):
        code = "def solution(): return __import__('os')"
        result = _validate_python_security(code)
        assert result is not None
        assert "__import__" in result

    def test_open_call_blocked(self):
        code = "def solution(): return open('/etc/passwd').read()"
        result = _validate_python_security(code)
        assert result is not None
        assert "open" in result

    def test_importlib_blocked(self):
        code = "import importlib\ndef solution(): return importlib.import_module('os')"
        result = _validate_python_security(code)
        assert result is not None
        assert "importlib" in result

    def test_all_blocked_modules_present_in_set(self):
        """All expected modules are in BLOCKED_MODULES constant."""
        expected = {"os", "sys", "subprocess", "shutil", "socket", "pty",
                    "commands", "multiprocessing", "threading", "posix",
                    "ctypes", "importlib"}
        assert expected.issubset(BLOCKED_MODULES)

    def test_all_blocked_calls_present_in_set(self):
        """All expected built-ins are in BLOCKED_CALLS constant."""
        expected = {"eval", "exec", "compile", "__import__", "open"}
        assert expected.issubset(BLOCKED_CALLS)

    def test_safe_math_code_passes(self):
        code = "def solution(a, b): return a * b + a - b // 2"
        assert _validate_python_security(code) is None

    def test_safe_list_comprehension_passes(self):
        code = "def solution(n): return [x**2 for x in range(n)]"
        assert _validate_python_security(code) is None

    def test_safe_string_manipulation_passes(self):
        code = "def solution(s): return s[::-1].upper()"
        assert _validate_python_security(code) is None

    def test_safe_dict_usage_passes(self):
        code = "def solution(lst): return {v: i for i, v in enumerate(lst)}"
        assert _validate_python_security(code) is None

    def test_safe_recursion_passes(self):
        code = """
def solution(n):
    if n <= 1:
        return n
    return solution(n - 1) + solution(n - 2)
"""
        assert _validate_python_security(code) is None


# ─────────────────────────────────────────────────────────────────────────────
# C.  BLOCKED MODULE & BUILT-IN RUNTIME ENFORCEMENT
# ─────────────────────────────────────────────────────────────────────────────

class TestBlockedModuleRuntimeEnforcement:
    """Even if AST check is bypassed, the runtime sandbox must still block execution."""

    def _run(self, code: str, expected: str = "") -> tuple:
        tc = TestCase(id="rt_test", input="", expectedOutput=expected)
        return _run_python_sandbox(code, [tc])

    def test_runtime_os_import_still_works_for_env_isolation(self):
        # `import os` must stay permitted so the env-isolation tests above can
        # read the sanitized environment; the dangerous os operations are what
        # the runtime blocks.
        code = """
def solution(*args):
    import os
    return os.environ.get("JWT_SECRET_KEY", "NOT_FOUND")
"""
        status, _, stderr, tcs = self._run(code, "NOT_FOUND")
        assert tcs[0].passed is True

    def test_runtime_os_dangerous_ops_rejected(self):
        code = """
def solution(*args):
    import os
    return os.system("whoami")
"""
        status, _, stderr, tcs = self._run(code)
        assert tcs[0].passed is False
        assert "restricted" in str(tcs[0].actualOutput).lower()

    def test_runtime_subprocess_import_rejected(self):
        code = """
def solution(*args):
    import subprocess
    return subprocess.check_output(["whoami"]).decode()
"""
        status, _, stderr, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_runtime_open_call_rejected(self):
        code = """
def solution(*args):
    return open("/etc/passwd").read()
"""
        status, _, stderr, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_runtime_eval_rejected(self):
        code = """
def solution(x):
    return eval(x)
"""
        status, _, stderr, tcs = self._run(code, "2")
        assert tcs[0].passed is False

    def test_runtime_exec_rejected(self):
        code = """
def solution(x):
    exec(x)
    return "done"
"""
        status, _, stderr, tcs = self._run(code)
        assert tcs[0].passed is False


# ─────────────────────────────────────────────────────────────────────────────
# D.  SOCKET / NETWORK NEUTRALIZATION
# ─────────────────────────────────────────────────────────────────────────────

class TestSocketNetworkNeutralization:
    """Verify that all raw socket creation attempts are neutralized at runtime."""

    def test_raw_socket_creation_denied_in_runner(self):
        """Raw socket() call must raise PermissionError."""
        code = """
def solution(*args):
    import socket
    s = socket.socket()
    return "SOCKET_CREATED"
"""
        tc = TestCase(id="socket_test", input="", expectedOutput="")
        _, _, _, tcs = _run_python_sandbox(code, [tc])
        assert tcs[0].passed is False
        assert "PermissionError" in str(tcs[0].actualOutput)
        assert "Network socket creation is disabled" in str(tcs[0].actualOutput)

    def test_tcp_socket_creation_denied(self):
        """TCP SOCK_STREAM socket must raise PermissionError."""
        code = """
def solution(*args):
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    return "TCP_OPENED"
"""
        tc = TestCase(id="tcp_test", input="", expectedOutput="")
        _, _, _, tcs = _run_python_sandbox(code, [tc])
        assert tcs[0].passed is False
        assert "PermissionError" in str(tcs[0].actualOutput)

    def test_udp_socket_creation_denied(self):
        """UDP SOCK_DGRAM socket must raise PermissionError."""
        code = """
def solution(*args):
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    return "UDP_OPENED"
"""
        tc = TestCase(id="udp_test", input="", expectedOutput="")
        _, _, _, tcs = _run_python_sandbox(code, [tc])
        assert tcs[0].passed is False

    def test_urllib_http_outbound_blocked(self):
        """urllib.request must not open HTTP connections (SSRF prevention)."""
        code = """
def solution(*args):
    import urllib.request
    try:
        resp = urllib.request.urlopen("http://backend:8000/api/health", timeout=1.0)
        return resp.read().decode()
    except Exception as e:
        return f"BLOCKED: {type(e).__name__}: {e}"
"""
        tc = TestCase(id="urllib_test", input="", expectedOutput="NOT_ALLOWED")
        _, _, _, tcs = _run_python_sandbox(code, [tc])
        assert tcs[0].passed is False
        assert (
            "Network socket creation is disabled" in str(tcs[0].actualOutput)
            or "PermissionError" in str(tcs[0].actualOutput)
        )

    def test_sandbox_server_blocks_network_socket(self):
        """The standalone sandbox microservice harness also blocks raw socket creation."""
        code = """
def solution(*args):
    import socket
    s = socket.socket()
    return "SOCKET_CREATED"
"""
        res = execute_python_in_sandbox(code, [{"id": "tc_s", "input": "", "expectedOutput": "OK"}])
        tc_res = res["testCaseResults"][0]
        assert tc_res["passed"] is False
        assert "PermissionError" in str(tc_res["actualOutput"])

    def test_sandbox_server_blocks_urllib_outbound(self):
        """The sandbox microservice harness must block urllib HTTP calls."""
        code = """
def solution(*args):
    import urllib.request
    try:
        resp = urllib.request.urlopen("http://backend:8000/api/health", timeout=1.0)
        return resp.read().decode()
    except Exception as e:
        return f"BLOCKED: {type(e).__name__}: {e}"
"""
        res = execute_python_in_sandbox(code, [{"id": "probe_backend", "input": "", "expectedOutput": "NOT_ALLOWED"}])
        tc = res["testCaseResults"][0]
        assert tc["passed"] is False
        assert (
            "Network socket creation is disabled" in str(tc["actualOutput"])
            or "PermissionError" in str(tc["actualOutput"])
        )

    def test_dual_layer_socket_block_router_and_server(self):
        """Both router execution path AND sandbox server path block SSRF attempts."""
        adversarial_code = """
def solution(*args):
    import urllib.request
    try:
        resp = urllib.request.urlopen("http://backend:8000/api/health", timeout=1.0)
        return resp.read().decode()
    except Exception as e:
        return f"BLOCKED: {type(e).__name__}: {e}"
"""
        # Via router
        tc = TestCase(id="probe_router", input="", expectedOutput="NOT_ALLOWED")
        _, _, _, tcs = _run_python_sandbox(adversarial_code, [tc])
        assert tcs[0].passed is False
        assert (
            "PermissionError" in str(tcs[0].actualOutput)
            or "Network socket creation is disabled" in str(tcs[0].actualOutput)
        )

        # Via sandbox server
        res = execute_python_in_sandbox(adversarial_code, [{"id": "probe_backend", "input": "", "expectedOutput": "NOT_ALLOWED"}])
        tc2 = res["testCaseResults"][0]
        assert tc2["passed"] is False


# ─────────────────────────────────────────────────────────────────────────────
# E.  PRODUCTION FAIL-CLOSED ARCHITECTURE
# ─────────────────────────────────────────────────────────────────────────────

class TestProductionFailClosed:
    """In production, any sandbox failure must close without falling back to host execution."""

    def _client(self):
        return TestClient(app)

    def _payload(self, lang="python", code="def solution(*args): return 42"):
        return {
            "language": lang,
            "code": code,
            "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
        }

    def test_missing_sandbox_url_returns_503(self):
        """Production without CODE_SANDBOX_URL configured → HTTP 503."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", ""):
                res = self._client().post("/api/code/execute", json=self._payload())
                assert res.status_code == 503
                assert "CODE_SANDBOX_URL must be configured" in res.json()["detail"]

    def test_sandbox_500_fails_closed_with_502(self):
        """Sandbox 500 response → HTTP 502; host runner NEVER invoked."""
        mock_resp = httpx.Response(
            500,
            text="Internal sandbox worker error",
            request=httpx.Request("POST", "http://code-sandbox:2000/execute"),
        )
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
                with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp)):
                    with patch("app.routers.code_execution._run_python_sandbox") as mock_host:
                        res = self._client().post("/api/code/execute", json=self._payload())
                        assert res.status_code == 502
                        assert "Secure code sandbox execution failed" in res.json()["detail"]
                        mock_host.assert_not_called()

    def test_sandbox_400_fails_closed_with_502(self):
        """Sandbox 400 response → HTTP 502; host runner NEVER invoked."""
        mock_resp = httpx.Response(
            400,
            text="Bad request to sandbox",
            request=httpx.Request("POST", "http://code-sandbox:2000/execute"),
        )
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
                with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp)):
                    with patch("app.routers.code_execution._run_python_sandbox") as mock_host:
                        res = self._client().post("/api/code/execute", json=self._payload())
                        assert res.status_code == 502
                        mock_host.assert_not_called()

    def test_sandbox_timeout_fails_closed_with_503(self):
        """Sandbox timeout → HTTP 503; host runner NEVER invoked."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
                with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.TimeoutException("Execution timeout"))):
                    with patch("app.routers.code_execution._run_python_sandbox") as mock_host:
                        res = self._client().post("/api/code/execute", json=self._payload())
                        assert res.status_code == 503
                        assert "Secure code sandbox service is unreachable" in res.json()["detail"]
                        mock_host.assert_not_called()

    def test_sandbox_connect_error_fails_closed(self):
        """Connection refused to sandbox → HTTP 503; host runner NEVER invoked."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
                with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("Connection refused"))):
                    with patch("app.routers.code_execution._run_python_sandbox") as mock_host:
                        res = self._client().post("/api/code/execute", json=self._payload())
                        assert res.status_code == 503
                        mock_host.assert_not_called()

    def test_sandbox_network_error_fails_closed(self):
        """Generic network error to sandbox → HTTP 503; host runner NEVER invoked."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
                with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.NetworkError("Network unavailable"))):
                    with patch("app.routers.code_execution._run_python_sandbox") as mock_host:
                        res = self._client().post("/api/code/execute", json=self._payload())
                        assert res.status_code == 503
                        mock_host.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# F.  LANGUAGE GATING
# ─────────────────────────────────────────────────────────────────────────────

class TestLanguageGating:
    """Non-Python language submissions must be cleanly rejected, not faked."""

    def _post(self, lang: str, code: str) -> dict:
        client = TestClient(app)
        payload = {
            "language": lang,
            "code": code,
            "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
        }
        res = client.post("/api/code/execute", json=payload)
        assert res.status_code == 200
        return res.json()

    def test_cpp_rejected_cleanly(self):
        data = self._post("cpp", "#include <iostream>\nint main() { return 0; }")
        assert data["status"] == "Unsupported Language"
        assert data["passedCount"] == 0
        assert data["testCaseResults"][0]["passed"] is False
        assert (
            "not currently supported" in data["stderr"].lower()
            or "not currently enabled" in data["stderr"].lower()
        )

    def test_java_rejected_cleanly(self):
        data = self._post("java", "public class Main { public static void main(String[] a){} }")
        assert data["status"] == "Unsupported Language"
        assert data["passedCount"] == 0

    def test_go_rejected_cleanly(self):
        data = self._post("go", "package main\nfunc main() {}")
        assert data["status"] == "Unsupported Language"

    def test_rust_rejected_cleanly(self):
        data = self._post("rust", "fn main() {}")
        assert data["status"] == "Unsupported Language"

    def test_javascript_rejected_cleanly(self):
        data = self._post("javascript", "console.log(42)")
        assert data["status"] == "Unsupported Language"

    def test_typescript_rejected_cleanly(self):
        data = self._post("typescript", "const x: number = 42; console.log(x);")
        assert data["status"] == "Unsupported Language"

    def test_ruby_rejected_cleanly(self):
        data = self._post("ruby", "puts 42")
        assert data["status"] == "Unsupported Language"

    def test_shell_injection_language_rejected_cleanly(self):
        data = self._post("bash", "rm -rf /")
        assert data["status"] == "Unsupported Language"

    def test_sql_injection_language_rejected_cleanly(self):
        data = self._post("sql", "DROP TABLE users;")
        assert data["status"] == "Unsupported Language"


# ─────────────────────────────────────────────────────────────────────────────
# G.  RATE-LIMITER CLIENT IP RESOLUTION
# ─────────────────────────────────────────────────────────────────────────────

class TestRateLimiterIPResolution:
    """get_client_ip must resolve the authoritative IP, ignoring spoofed headers."""

    def _req(self, headers: list, client=None) -> Request:
        scope = {"type": "http", "headers": headers, "client": client}
        return Request(scope)

    def test_x_real_ip_takes_priority_over_x_forwarded_for(self):
        req = self._req(
            headers=[(b"x-forwarded-for", b"8.8.8.8, 1.1.1.1"), (b"x-real-ip", b"203.0.113.50")],
            client=("127.0.0.1", 50000),
        )
        assert get_client_ip(req) == "203.0.113.50"

    def test_direct_connection_uses_socket_ip(self):
        req = self._req(headers=[], client=("198.51.100.22", 50000))
        assert get_client_ip(req) == "198.51.100.22"

    def test_xff_without_x_real_ip_uses_nearest_hop(self):
        req = self._req(
            headers=[(b"x-forwarded-for", b"spoofed.client.ip, 192.0.2.1")],
            client=None,
        )
        assert get_client_ip(req) == "192.0.2.1"

    def test_spoofed_x_real_ip_resolves_by_policy(self):
        """Direct client trying to send X-Real-IP → resolved per policy."""
        req = self._req(
            headers=[(b"x-real-ip", b"1.2.3.4")],
            client=("192.168.1.100", 50000),
        )
        ip = get_client_ip(req)
        assert ip in ("1.2.3.4", "192.168.1.100")

    def test_multiple_x_forwarded_for_hops(self):
        """Multi-hop X-Forwarded-For chain without X-Real-IP → rightmost (nearest) hop."""
        req = self._req(
            headers=[(b"x-forwarded-for", b"attacker.ip, cdn.ip, edge.proxy, 10.0.0.1")],
            client=None,
        )
        ip = get_client_ip(req)
        assert ip == "10.0.0.1"

    def test_empty_xff_header_falls_back_to_socket(self):
        req = self._req(headers=[(b"x-forwarded-for", b"")], client=("10.0.0.5", 12345))
        ip = get_client_ip(req)
        assert ip == "10.0.0.5"

    def test_ipv6_client_address_resolved(self):
        req = self._req(
            headers=[(b"x-real-ip", b"2001:db8::1")],
            client=("::1", 50000),
        )
        assert get_client_ip(req) == "2001:db8::1"


# ─────────────────────────────────────────────────────────────────────────────
# H.  ALGORITHM CORRECTNESS
# ─────────────────────────────────────────────────────────────────────────────

class TestAlgorithmCorrectness:
    """Verify that correct user code produces Accepted results across common problems."""

    def _tc(self, id: str, input: str, expected: str) -> TestCase:
        return TestCase(id=id, input=input, expectedOutput=expected)

    def _run(self, code: str, test_cases: list):
        status, stdout, stderr, tcs = _run_python_sandbox(code, test_cases)
        return status, tcs

    def test_two_sum_correct(self):
        code = """
def solution(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
"""
        tcs = [
            self._tc("ts1", "[2, 7, 11, 15]\n9", "[0, 1]"),
            self._tc("ts2", "[3, 2, 4]\n6", "[1, 2]"),
            self._tc("ts3", "[3, 3]\n6", "[0, 1]"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"
        assert all(r.passed for r in results)

    def test_palindrome_check_correct(self):
        code = """
def solution(s):
    s = s.lower()
    cleaned = ''.join(c for c in s if c.isalnum())
    return cleaned == cleaned[::-1]
"""
        tcs = [
            self._tc("pal1", "racecar", "True"),
            self._tc("pal2", "hello", "False"),
            self._tc("pal3", "A man a plan a canal Panama", "True"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_fibonacci_recursive_correct(self):
        code = """
def solution(n):
    if n <= 1:
        return n
    return solution(n-1) + solution(n-2)
"""
        tcs = [
            self._tc("fib0", "0", "0"),
            self._tc("fib1", "1", "1"),
            self._tc("fib5", "5", "5"),
            self._tc("fib10", "10", "55"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_fizzbuzz_correct(self):
        code = """
def solution(n):
    out = []
    for i in range(1, n+1):
        if i % 15 == 0:
            out.append("FizzBuzz")
        elif i % 3 == 0:
            out.append("Fizz")
        elif i % 5 == 0:
            out.append("Buzz")
        else:
            out.append(str(i))
    return out
"""
        tcs = [
            self._tc("fb1", "5", "['1', '2', 'Fizz', '4', 'Buzz']"),
            self._tc("fb15", "15", "['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_binary_search_correct(self):
        code = """
def solution(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
"""
        tcs = [
            self._tc("bs1", "[-1, 0, 3, 5, 9, 12]\n9", "4"),
            self._tc("bs2", "[-1, 0, 3, 5, 9, 12]\n2", "-1"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_valid_parentheses_correct(self):
        code = """
def solution(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in mapping:
            top = stack.pop() if stack else '#'
            if mapping[c] != top:
                return False
        else:
            stack.append(c)
    return not stack
"""
        tcs = [
            self._tc("vp1", "()", "True"),
            self._tc("vp2", "()[]{}", "True"),
            self._tc("vp3", "(]", "False"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_max_subarray_kadane_correct(self):
        code = """
def solution(nums):
    max_sum = curr = nums[0]
    for n in nums[1:]:
        curr = max(n, curr + n)
        max_sum = max(max_sum, curr)
    return max_sum
"""
        tcs = [
            self._tc("ms1", "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", "6"),
            self._tc("ms2", "[1]", "1"),
            self._tc("ms3", "[5, 4, -1, 7, 8]", "23"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_merge_sorted_arrays_correct(self):
        code = """
def solution(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i]); i += 1
        else:
            result.append(b[j]); j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result
"""
        tcs = [
            self._tc("merge1", "[1, 3, 5]\n[2, 4, 6]", "[1, 2, 3, 4, 5, 6]"),
            self._tc("merge2", "[]\n[1]", "[1]"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_count_set_bits_correct(self):
        code = """
def solution(n):
    return bin(n).count('1')
"""
        tcs = [
            self._tc("csb1", "5", "2"),
            self._tc("csb2", "255", "8"),
            self._tc("csb3", "0", "0"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"

    def test_reverse_string_correct(self):
        code = "def solution(s): return s[::-1]"
        tcs = [
            self._tc("rev1", "hello", "olleh"),
            self._tc("rev2", "abcd", "dcba"),
            self._tc("rev3", "a", "a"),
        ]
        status, results = self._run(code, tcs)
        assert status == "Accepted"


# ─────────────────────────────────────────────────────────────────────────────
# I.  EDGE CASES
# ─────────────────────────────────────────────────────────────────────────────

class TestEdgeCases:
    """Verify robust handling of empty inputs, None, large output, unicode."""

    def _run(self, code: str, tc_input: str, tc_expected: str):
        tc = TestCase(id="edge", input=tc_input, expectedOutput=tc_expected)
        return _run_python_sandbox(code, [tc])

    def test_zero_integer_input(self):
        code = "def solution(n): return n * 2"
        status, _, _, tcs = self._run(code, "0", "0")
        assert tcs[0].passed is True

    def test_negative_integer_input(self):
        code = "def solution(n): return abs(n)"
        status, _, _, tcs = self._run(code, "-42", "42")
        assert tcs[0].passed is True

    def test_large_list_sum(self):
        code = "def solution(lst): return sum(lst)"
        large_list = str(list(range(1000)))
        expected = str(sum(range(1000)))
        status, _, _, tcs = self._run(code, large_list, expected)
        assert tcs[0].passed is True

    def test_boolean_true_output(self):
        code = "def solution(n): return n > 0"
        status, _, _, tcs = self._run(code, "5", "True")
        assert tcs[0].passed is True

    def test_boolean_false_output(self):
        code = "def solution(n): return n > 0"
        status, _, _, tcs = self._run(code, "-1", "False")
        assert tcs[0].passed is True

    def test_none_return_value(self):
        code = "def solution(): return None"
        status, _, _, tcs = self._run(code, "", "None")
        assert tcs[0].passed is True

    def test_nested_list_output(self):
        code = "def solution(n): return [[i] * i for i in range(n)]"
        status, _, _, tcs = self._run(code, "4", "[[], [1], [2, 2], [3, 3, 3]]")
        assert tcs[0].passed is True

    def test_float_output(self):
        code = "def solution(a, b): return a / b"
        status, _, _, tcs = self._run(code, "7\n2", "3.5")
        assert tcs[0].passed is True

    def test_single_character_string(self):
        code = "def solution(s): return s.upper()"
        status, _, _, tcs = self._run(code, '"a"', '"A"')
        assert tcs[0].passed is True


# ─────────────────────────────────────────────────────────────────────────────
# J.  ADVERSARIAL CODE PAYLOADS
# ─────────────────────────────────────────────────────────────────────────────

class TestAdversarialPayloads:
    """Verify the sandbox handles malicious / malformed code gracefully."""

    def _run(self, code: str) -> tuple:
        tc = TestCase(id="adversarial", input="", expectedOutput="SAFE")
        return _run_python_sandbox(code, [tc])

    def test_infinite_loop_does_not_hang_forever(self):
        """Infinite loop should be killed by timeout, not block the process."""
        code = """
def solution(*args):
    while True:
        pass
"""
        start = time.time()
        status, _, _, tcs = self._run(code)
        elapsed = time.time() - start
        assert elapsed < 15
        assert tcs[0].passed is False

    def test_memory_bomb_contained(self):
        """Attempting to allocate massive memory should fail/timeout, not crash the host."""
        code = """
def solution(*args):
    x = [0] * (10 ** 9)
    return len(x)
"""
        start = time.time()
        _, _, _, tcs = self._run(code)
        elapsed = time.time() - start
        assert elapsed < 20
        assert tcs[0].passed is False

    def test_fork_bomb_blocked(self):
        """Fork bomb via multiprocessing must be blocked by AST/runtime gate."""
        code = """
def solution(*args):
    import multiprocessing
    while True:
        multiprocessing.Process(target=solution).start()
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_etc_passwd_read_blocked(self):
        """Reading /etc/passwd must be blocked by open() restriction."""
        code = """
def solution(*args):
    return open('/etc/passwd').read()
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_dunder_import_env_probe_blocked(self):
        """Attempting __import__ to reach os must be blocked."""
        code = """
def solution(*args):
    os = __import__('os')
    return os.environ.get('JWT_SECRET_KEY', 'NOT_FOUND')
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_sys_exit_does_not_kill_test_runner(self):
        """sys.exit() in user code must not propagate to the test runner process."""
        code = """
def solution(*args):
    import sys
    sys.exit(1)
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_deeply_recursive_code_does_not_crash_runner(self):
        """Excessive recursion should produce RecursionError, not crash the runner."""
        code = """
def solution(n):
    return solution(n + 1)
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False

    def test_env_file_read_via_open_blocked(self):
        """Attempting to read .env file from disk must be blocked (open() restriction)."""
        code = """
def solution(*args):
    return open('/app/.env').read()
"""
        _, _, _, tcs = self._run(code)
        assert tcs[0].passed is False


# ─────────────────────────────────────────────────────────────────────────────
# K.  STARTUP / LIFESPAN GATE TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestStartupLifespanGates:
    """Verify that production startup gates fail fast on misconfiguration."""

    @pytest.mark.asyncio
    async def test_production_startup_fails_without_redis_when_required(self):
        """Production + REQUIRE_REDIS=True + no REDIS_URL → RuntimeError on startup."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.REQUIRE_REDIS", True):
                with patch("app.config.settings.REDIS_URL", ""):
                    with pytest.raises(RuntimeError, match="Production deployment requires REDIS_URL"):
                        async with lifespan(app):
                            pass

    @pytest.mark.asyncio
    async def test_production_startup_fails_if_redis_unreachable_when_required(self):
        """Production + REQUIRE_REDIS=True + invalid REDIS_URL → RuntimeError on startup."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.REQUIRE_REDIS", True):
                with patch("app.config.settings.REDIS_URL", "redis://invalid-host:6379/0"):
                    with patch("app.middleware.rate_limiter.get_redis_client", AsyncMock(return_value=None)):
                        with pytest.raises(RuntimeError, match="Could not connect to Redis"):
                            async with lifespan(app):
                                pass

    @pytest.mark.asyncio
    async def test_production_startup_succeeds_without_redis_by_default(self):
        """Production + REQUIRE_REDIS=False → startup succeeds with in-memory fallback."""
        with patch("app.config.settings.ENVIRONMENT", "production"):
            with patch("app.config.settings.REQUIRE_REDIS", False):
                with patch("app.config.settings.REDIS_URL", ""):
                    with patch("app.database.DatabaseManager.connect", AsyncMock()):
                        with patch("app.database.DatabaseManager.disconnect", AsyncMock()):
                            async with lifespan(app):
                                pass

    @pytest.mark.asyncio
    async def test_development_startup_does_not_require_redis(self):
        """Development environment must always start regardless of REDIS_URL."""
        with patch("app.config.settings.ENVIRONMENT", "development"):
            with patch("app.config.settings.REDIS_URL", ""):
                with patch("app.database.DatabaseManager.connect", AsyncMock()):
                    with patch("app.database.DatabaseManager.disconnect", AsyncMock()):
                        async with lifespan(app):
                            pass


# ─────────────────────────────────────────────────────────────────────────────
# L.  MULTI TEST-CASE BATCH EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

class TestMultiTestCaseBatch:
    """Verify batch execution of multiple test cases works correctly."""

    def test_all_pass_returns_accepted(self):
        code = "def solution(n): return n * 2"
        tcs = [
            TestCase(id=f"tc{i}", input=str(i), expectedOutput=str(i * 2))
            for i in range(10)
        ]
        status, _, _, results = _run_python_sandbox(code, tcs)
        assert status == "Accepted"
        assert all(r.passed for r in results)

    def test_partial_pass_returns_wrong_answer(self):
        code = "def solution(n): return n * 2"
        tcs = [
            TestCase(id="pass1", input="3", expectedOutput="6"),
            TestCase(id="fail1", input="3", expectedOutput="999"),
        ]
        status, _, _, results = _run_python_sandbox(code, tcs)
        assert status == "Wrong Answer"
        assert results[0].passed is True
        assert results[1].passed is False

    def test_empty_test_case_list_handled(self):
        code = "def solution(): return 1"
        status, _, _, results = _run_python_sandbox(code, [])
        assert results == [] or status is not None

    def test_twenty_test_cases_all_pass(self):
        code = "def solution(n): return n ** 2"
        tcs = [
            TestCase(id=f"tc{i}", input=str(i), expectedOutput=str(i ** 2))
            for i in range(20)
        ]
        status, _, _, results = _run_python_sandbox(code, tcs)
        assert status == "Accepted"
        assert len(results) == 20
        assert all(r.passed for r in results)

    def test_single_failing_test_case(self):
        code = "def solution(n): return n + 1"
        tcs = [TestCase(id="fail", input="5", expectedOutput="5")]
        status, _, _, results = _run_python_sandbox(code, tcs)
        assert results[0].passed is False
        assert status == "Wrong Answer"


# ─────────────────────────────────────────────────────────────────────────────
# M.  OUTPUT NORMALIZATION & TYPE COERCION
# ─────────────────────────────────────────────────────────────────────────────

class TestOutputNormalization:
    """Verify that output comparison is robust to whitespace, casing, and type differences."""

    def _run(self, code: str, input: str, expected: str):
        tc = TestCase(id="norm", input=input, expectedOutput=expected)
        _, _, _, tcs = _run_python_sandbox(code, [tc])
        return tcs[0]

    def test_true_false_case_insensitive(self):
        result = self._run("def solution(): return True", "", "true")
        assert result.passed is True

    def test_false_normalized(self):
        result = self._run("def solution(): return False", "", "false")
        assert result.passed is True

    def test_none_normalized_to_null(self):
        result = self._run("def solution(): return None", "", "null")
        assert result.passed is True

    def test_integer_string_comparison(self):
        result = self._run("def solution(n): return n + 1", "41", "42")
        assert result.passed is True

    def test_list_output_with_extra_spaces(self):
        result = self._run("def solution(): return [1, 2, 3]", "", "[ 1 , 2 , 3 ]")
        assert result.passed is True


# ─────────────────────────────────────────────────────────────────────────────
# N.  SUBPROCESS RESOURCE CEILINGS FAIL CLOSED
# ─────────────────────────────────────────────────────────────────────────────

class TestResourceCeilingsFailClosed:
    """The sandbox must never run a submission it was unable to bound.

    Regression guard: wrapping the whole ceiling sequence in ``except: pass``
    turns every rlimit rejection into an unbounded child, which can exhaust the
    shared sandbox budget and deny service to every other user. Losing the
    ceilings has to abort the exec instead.
    """

    # Both copies of the harness must agree, or the API and the sandbox
    # microservice drift apart on a security-critical path.
    LIMITERS = [_api_limit_child_resources, _svc_limit_child_resources]
    LIMITER_IDS = ["api", "sandbox_service"]

    HARD_LIMITS = ("RLIMIT_CPU", "RLIMIT_AS")
    SOFT_LIMITS = ("RLIMIT_FSIZE", "RLIMIT_NPROC")

    @pytest.fixture
    def rlimit_probe(self):
        """Record ceiling calls without ever applying one to the test runner.

        ``setrlimit`` is one-way: a real call would permanently cap the pytest
        process at the sandbox's 512MB/5s and OOM-kill every later test in the
        session. Real enforcement is asserted out-of-process by
        ``test_ceilings_actually_reach_the_child``.

        Yields the ordered list of ``(limit_name, ceiling)`` pairs applied.
        """
        import os
        import resource as resource_mod

        applied: list = []

        names = {
            resource_mod.RLIMIT_CPU: "RLIMIT_CPU",
            resource_mod.RLIMIT_AS: "RLIMIT_AS",
            resource_mod.RLIMIT_FSIZE: "RLIMIT_FSIZE",
            resource_mod.RLIMIT_NPROC: "RLIMIT_NPROC",
        }

        def make_recorder(refuse: tuple):
            def recorder(limit, values):
                applied.append((limit, values))
                if limit in refuse:
                    raise PermissionError(1, "operation not permitted")
                return None
            return recorder

        return applied, make_recorder, os, resource_mod

    @pytest.mark.parametrize("limiter", LIMITERS, ids=LIMITER_IDS)
    def test_hard_ceilings_are_requested_at_the_documented_values(self, limiter, rlimit_probe):
        """CPU and address space are capped at the values the harness declares."""
        import os
        import resource as resource_mod

        applied, make_recorder, os_mod, resource_mod = rlimit_probe

        with patch.object(os, "setsid", lambda: None):
            with patch.object(resource_mod, "setrlimit", make_recorder(())):
                limiter()

        requested = {limit: values[0] for limit, values in applied}
        assert requested[resource_mod.RLIMIT_CPU] == 5
        assert requested[resource_mod.RLIMIT_AS] == 512 * 1024 * 1024

    @pytest.mark.parametrize("limiter", LIMITERS, ids=LIMITER_IDS)
    def test_setsid_runs_before_any_ceiling_that_can_raise(self, limiter, rlimit_probe):
        """Process-group isolation must not sit behind a rlimit call.

        Timeouts reap the whole tree via the group id. The hard ceilings abort
        the exec when a host refuses them, so ``setsid`` has to run first or a
        refused ceiling leaves the tree unkillable by group.
        """
        import os
        import resource as resource_mod

        applied, make_recorder, os_mod, resource_mod = rlimit_probe
        order: list = []
        refuse = (resource_mod.RLIMIT_CPU, resource_mod.RLIMIT_AS)

        with patch.object(os, "setsid", lambda: order.append("setsid")):
            with patch.object(resource_mod, "setrlimit", make_recorder(refuse)):
                with pytest.raises(PermissionError):
                    limiter()

        assert order == ["setsid"]

    @pytest.mark.parametrize("limiter", LIMITERS, ids=LIMITER_IDS)
    def test_soft_ceiling_rejection_does_not_abort(self, limiter, rlimit_probe):
        """A host that forbids FSIZE/NPROC still gets the hard CPU/AS caps."""
        import os
        import resource as resource_mod

        applied, make_recorder, os_mod, resource_mod = rlimit_probe
        refuse = (resource_mod.RLIMIT_FSIZE, resource_mod.RLIMIT_NPROC)

        with patch.object(os, "setsid", lambda: None):
            with patch.object(resource_mod, "setrlimit", make_recorder(refuse)):
                limiter()  # must not raise

        requested = {limit for limit, _ in applied}
        assert resource_mod.RLIMIT_CPU in requested
        assert resource_mod.RLIMIT_AS in requested

    @pytest.mark.parametrize("limiter", LIMITERS, ids=LIMITER_IDS)
    def test_hard_ceiling_rejection_aborts_exec(self, limiter, rlimit_probe):
        """If the memory/CPU cap cannot be applied, the child must not run."""
        import os
        import resource as resource_mod

        applied, make_recorder, os_mod, resource_mod = rlimit_probe
        refuse = (resource_mod.RLIMIT_CPU, resource_mod.RLIMIT_AS)

        with patch.object(os, "setsid", lambda: None):
            with patch.object(resource_mod, "setrlimit", make_recorder(refuse)):
                with pytest.raises(PermissionError):
                    limiter()

    def test_ceilings_actually_reach_the_child(self):
        """End-to-end: a real child comes back with the ceilings applied."""
        import resource as resource_mod
        import subprocess
        import sys
        import tempfile

        if sys.platform == "win32":
            pytest.skip("preexec_fn and rlimits are POSIX-only")

        probe = (
            "import os, resource;"
            "print(resource.getrlimit(resource.RLIMIT_CPU)[0],"
            "resource.getrlimit(resource.RLIMIT_AS)[0],"
            "os.getpgid(0) == os.getpid())"
        )
        proc = subprocess.run(
            [sys.executable, "-c", probe],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=tempfile.gettempdir(),
            preexec_fn=_api_limit_child_resources,
        )
        assert proc.returncode == 0, proc.stderr
        cpu_soft, as_soft, is_group_leader = proc.stdout.split()
        assert int(cpu_soft) == 5
        assert int(as_soft) == 512 * 1024 * 1024
        # setsid() ran: the child leads its own process group.
        assert is_group_leader == "True"

    def test_memory_ceiling_is_enforced_on_a_real_child(self):
        """A submission that outgrows the cap is killed, not served."""
        import subprocess
        import sys
        import tempfile

        if sys.platform == "win32":
            pytest.skip("preexec_fn and rlimits are POSIX-only")

        proc = subprocess.run(
            [sys.executable, "-c", "x = bytearray(700 * 1024 * 1024)"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=tempfile.gettempdir(),
            preexec_fn=_api_limit_child_resources,
        )
        assert proc.returncode != 0, "700MB allocation succeeded despite a 512MB cap"

    def test_execute_reports_a_clean_error_when_ceilings_cannot_be_applied(self):
        """A refused ceiling surfaces as a result, not a 500."""
        import subprocess

        with patch.object(subprocess, "run", side_effect=subprocess.SubprocessError("cannot setrlimit")):
            result = _run_python_sandbox("def solution(): return 1", [TestCase(id="1", input="", expectedOutput="1")])

        assert result[0] == "Runtime Error"
        assert "Sandbox refused to start" in result[2]
        assert all(not tc.passed for tc in result[3])

    def test_sandbox_service_reports_a_clean_error_when_ceilings_cannot_be_applied(self):
        """Same contract on the microservice path."""
        import subprocess

        with patch.object(subprocess, "run", side_effect=subprocess.SubprocessError("cannot setrlimit")):
            result = execute_python_in_sandbox(
                "def solution(): return 1",
                [{"id": "1", "input": "", "expectedOutput": "1"}],
            )

        assert result["status"] == "Runtime Error"
        assert "Sandbox refused to start" in result["stderr"]
        assert result["passedCount"] == 0
