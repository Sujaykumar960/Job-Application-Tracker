"""
Comprehensive verification suite for code execution sandbox security,
production fail-closed architecture, socket neutralization,
and authoritative client IP rate limiting.
"""

import os
from unittest.mock import AsyncMock, patch
import pytest
from starlette.testclient import TestClient
from starlette.requests import Request
import httpx

from app.main import app, lifespan
from app.middleware.rate_limiter import get_client_ip
from app.routers.code_execution import _run_python_sandbox
from app.schemas.question import TestCase
from sandbox.server import execute_python_in_sandbox


def test_sandbox_environment_secrets_isolated():
    """Verify that host environment variables (JWT_SECRET_KEY, MONGO_URI, GROQ_API_KEY)
    are strictly stripped from the code execution subprocess environment.
    """
    with patch.dict(os.environ, {
        "JWT_SECRET_KEY": "super_secret_jwt_key_that_must_not_leak",
        "MONGO_URI": "mongodb://admin:super_secret_password@db:27017",
        "GROQ_API_KEY": "gsk_super_secret_groq_api_key",
    }):
        user_code = """
def solution(*args):
    import os
    # Probe environment for sensitive application secrets
    jwt = os.environ.get("JWT_SECRET_KEY", "NOT_FOUND")
    mongo = os.environ.get("MONGO_URI", "NOT_FOUND")
    groq = os.environ.get("GROQ_API_KEY", "NOT_FOUND")
    return f"{jwt}:{mongo}:{groq}"
"""
        test_case = TestCase(
            id="probe_1",
            input="",
            expectedOutput="NOT_FOUND:NOT_FOUND:NOT_FOUND",
        )

        status, stdout, stderr, tcs = _run_python_sandbox(user_code, [test_case])

        assert len(tcs) == 1
        assert tcs[0].actualOutput == "NOT_FOUND:NOT_FOUND:NOT_FOUND"
        assert tcs[0].passed is True
        assert status == "Accepted"


def test_code_execution_prohibited_on_host_in_production():
    """Verify that in production mode without CODE_SANDBOX_URL,
    direct host execution is strictly rejected with HTTP 503.
    """
    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.CODE_SANDBOX_URL", ""):
            client = TestClient(app)
            payload = {
                "language": "python",
                "code": "def solution(): return 42",
                "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
            }
            res = client.post("/api/code/execute", json=payload)
            assert res.status_code == 503
            assert "CODE_SANDBOX_URL must be configured" in res.json()["detail"]


def test_production_non_200_sandbox_response_fails_closed():
    """CRITICAL SECURITY TEST: Verify that in production mode, if the sandbox
    container returns a non-200 HTTP response (e.g. 500 or 400), the API
    fails closed with HTTP 502 and NEVER falls through to host execution.
    """
    mock_resp = httpx.Response(500, text="Internal sandbox worker error", request=httpx.Request("POST", "http://code-sandbox:2000/execute"))

    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
            with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp)):
                with patch("app.routers.code_execution._run_python_sandbox") as mock_host_runner:
                    client = TestClient(app)
                    payload = {
                        "language": "python",
                        "code": "def solution(*args): return 42",
                        "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
                    }
                    res = client.post("/api/code/execute", json=payload)
                    assert res.status_code == 502
                    assert "Secure code sandbox execution failed" in res.json()["detail"]
                    # Assert host execution was NEVER called
                    mock_host_runner.assert_not_called()


def test_production_sandbox_timeout_fails_closed():
    """Verify that in production mode, if the sandbox container connection times out,
    the API fails closed with HTTP 503 and NEVER falls through to host execution.
    """
    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.CODE_SANDBOX_URL", "http://code-sandbox:2000"):
            with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.TimeoutException("Execution timeout"))):
                with patch("app.routers.code_execution._run_python_sandbox") as mock_host_runner:
                    client = TestClient(app)
                    payload = {
                        "language": "python",
                        "code": "def solution(*args): return 42",
                        "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
                    }
                    res = client.post("/api/code/execute", json=payload)
                    assert res.status_code == 503
                    assert "Secure code sandbox service is unreachable" in res.json()["detail"]
                    mock_host_runner.assert_not_called()


def test_unsupported_language_returns_error_not_fake_accepted():
    """Verify that non-Python languages (e.g. C++, Java, Go) return status='Unsupported Language'
    with passed=False, rather than constructing fake 'Accepted' results.
    """
    client = TestClient(app)
    payload = {
        "language": "cpp",
        "code": "#include <iostream>\nint main() { return 0; }",
        "testCases": [{"id": "tc1", "input": "", "expectedOutput": "42"}],
    }
    res = client.post("/api/code/execute", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Unsupported Language"
    assert data["passedCount"] == 0
    assert data["testCaseResults"][0]["passed"] is False
    assert "not currently supported" in data["stderr"].lower() or "not currently enabled" in data["stderr"].lower()


def test_network_socket_creation_denied_in_runner():
    """Verify that user code attempting to create raw network sockets
    is immediately denied with PermissionError.
    """
    user_code = """
def solution(*args):
    import socket
    s = socket.socket()
    return "SOCKET_CREATED"
"""
    test_case = TestCase(id="tc_net", input="", expectedOutput="")
    status, stdout, stderr, tcs = _run_python_sandbox(user_code, [test_case])
    assert tcs[0].passed is False
    assert "PermissionError" in str(tcs[0].actualOutput)
    assert "Network socket creation is disabled" in str(tcs[0].actualOutput)


def test_sandbox_server_blocks_network_socket():
    """Verify that the dedicated sandbox microservice harness blocks raw sockets."""
    user_code = """
def solution(*args):
    import socket
    s = socket.socket()
    return "SOCKET_CREATED"
"""
    res = execute_python_in_sandbox(user_code, [{"id": "tc_s", "input": "", "expectedOutput": "OK"}])
    tc_res = res["testCaseResults"][0]
    assert tc_res["passed"] is False
    assert "PermissionError" in str(tc_res["actualOutput"])


def test_rate_limiter_client_ip_authoritative_resolution():
    """Verify that get_client_ip authoritatively trusts X-Real-IP set by Nginx,
    ignoring spoofed client-supplied X-Forwarded-For headers.
    """
    # Case 1: Attacker sends spoofed X-Forwarded-For, but Nginx sets X-Real-IP
    scope = {
        "type": "http",
        "headers": [
            (b"x-forwarded-for", b"8.8.8.8, 1.1.1.1"),
            (b"x-real-ip", b"203.0.113.50"),
        ],
        "client": ("127.0.0.1", 50000),
    }
    req = Request(scope)
    assert get_client_ip(req) == "203.0.113.50"

    # Case 2: Direct connection without reverse proxy header
    scope_direct = {
        "type": "http",
        "headers": [],
        "client": ("198.51.100.22", 50000),
    }
    req_direct = Request(scope_direct)
    assert get_client_ip(req_direct) == "198.51.100.22"

    # Case 3: Reverse proxy hops in X-Forwarded-For without X-Real-IP takes nearest hop
    scope_xff = {
        "type": "http",
        "headers": [
            (b"x-forwarded-for", b"spoofed.client.ip, 192.0.2.1"),
        ],
        "client": None,
    }
    req_xff = Request(scope_xff)
    assert get_client_ip(req_xff) == "192.0.2.1"


def test_sandbox_cannot_reach_backend_via_http():
    """Adversarial verification: ensure user code inside sandbox attempting to connect
    to the internal backend network (http://backend:8000/api/health) is stopped by socket neutralization.
    """
    adversarial_code = """
def solution(*args):
    import urllib.request
    try:
        resp = urllib.request.urlopen("http://backend:8000/api/health", timeout=1.0)
        return resp.read().decode()
    except Exception as e:
        return f"BLOCKED: {type(e).__name__}: {e}"
"""
    # 1. Test via sandbox server harness
    res = execute_python_in_sandbox(adversarial_code, [{"id": "probe_backend", "input": "", "expectedOutput": "NOT_ALLOWED"}])
    tc = res["testCaseResults"][0]
    assert tc["passed"] is False
    assert "Network socket creation is disabled" in str(tc["actualOutput"]) or "PermissionError" in str(tc["actualOutput"])

    # 2. Test via router execution helper
    test_case = TestCase(id="probe_backend", input="", expectedOutput="NOT_ALLOWED")
    status, stdout, stderr, tcs = _run_python_sandbox(adversarial_code, [test_case])
    assert tcs[0].passed is False
    assert "PermissionError" in str(tcs[0].actualOutput) or "Network socket creation is disabled" in str(tcs[0].actualOutput)


@pytest.mark.asyncio
async def test_production_startup_fails_without_redis_when_required():
    """Verify that in production mode, app startup fails fast if REDIS_URL is not set and REQUIRE_REDIS=True."""
    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.REQUIRE_REDIS", True):
            with patch("app.config.settings.REDIS_URL", ""):
                with pytest.raises(RuntimeError, match="Production deployment requires REDIS_URL"):
                    async with lifespan(app):
                        pass


@pytest.mark.asyncio
async def test_production_startup_fails_if_redis_unreachable_when_required():
    """Verify that in production mode, app startup fails fast if Redis cannot be reached and REQUIRE_REDIS=True."""
    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.REQUIRE_REDIS", True):
            with patch("app.config.settings.REDIS_URL", "redis://invalid-host:6379/0"):
                with patch("app.middleware.rate_limiter.get_redis_client", AsyncMock(return_value=None)):
                    with pytest.raises(RuntimeError, match="Could not connect to Redis"):
                        async with lifespan(app):
                            pass


@pytest.mark.asyncio
async def test_production_startup_succeeds_without_redis_by_default():
    """Verify that in production mode, app startup falls back gracefully to in-memory rate limiter when REDIS_URL is not set."""
    with patch("app.config.settings.ENVIRONMENT", "production"):
        with patch("app.config.settings.REQUIRE_REDIS", False):
            with patch("app.config.settings.REDIS_URL", ""):
                with patch("app.database.DatabaseManager.connect", AsyncMock()):
                    with patch("app.database.DatabaseManager.disconnect", AsyncMock()):
                        async with lifespan(app):
                            pass
