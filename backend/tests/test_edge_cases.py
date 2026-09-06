"""
Edge-case and security tests for the CareerX API.
Covers: duplicate registration, invalid JWT, unauthenticated access,
malformed JSON, and missing required fields.
"""
import pytest
from starlette.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_REG_PAYLOAD = {
    "name": "Edge Case User",
    "email": "edge_case_contrib@careerx.io",
    "password": "Password12345!",
    "role": "seeker",
}


def _register_and_login(client: TestClient) -> str:
    """Register (or skip if already exists) and return a valid JWT token."""
    reg_res = client.post("/api/auth/register", json=_REG_PAYLOAD)
    assert reg_res.status_code in (201, 400)
    if reg_res.status_code == 201:
        return reg_res.json()["token"]
    login_res = client.post(
        "/api/auth/login",
        json={"email": _REG_PAYLOAD["email"], "password": _REG_PAYLOAD["password"]},
    )
    assert login_res.status_code == 200
    return login_res.json()["token"]


# ---------------------------------------------------------------------------
# Auth edge cases
# ---------------------------------------------------------------------------


def test_register_duplicate_email(client: TestClient):
    """Registering the same email twice must return 400 or 409, not 500."""
    payload = {
        "name": "Duplicate User",
        "email": "dup_user_contrib@careerx.io",
        "password": "Password12345!",
        "role": "seeker",
    }
    first = client.post("/api/auth/register", json=payload)
    assert first.status_code in (201, 400)
    second = client.post("/api/auth/register", json=payload)
    assert second.status_code in (400, 409), (
        f"Expected 400/409 for duplicate email, got {second.status_code}"
    )


def test_login_wrong_password(client: TestClient):
    """Login with a bad password must return 401, not 500."""
    # Ensure user exists first
    client.post("/api/auth/register", json=_REG_PAYLOAD)
    res = client.post(
        "/api/auth/login",
        json={"email": _REG_PAYLOAD["email"], "password": "WrongPassword999!"},
    )
    assert res.status_code in (400, 401), (
        f"Expected 400/401 for wrong password, got {res.status_code}"
    )


def test_login_nonexistent_user(client: TestClient):
    """Login attempt for an email that was never registered returns 400/404."""
    res = client.post(
        "/api/auth/login",
        json={"email": "nobody_exist_contrib@careerx.io", "password": "Anything1!"},
    )
    assert res.status_code in (400, 401, 404), (
        f"Expected 400/401/404 for unknown user, got {res.status_code}"
    )


def test_login_invalid_email_format(client: TestClient):
    """Login with a syntactically invalid email triggers 422 validation."""
    res = client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": "Password12345!"},
    )
    assert res.status_code == 422
    body = res.json()
    assert "statusCode" in body
    assert body["statusCode"] == 422


# ---------------------------------------------------------------------------
# JWT / Authorization edge cases
# ---------------------------------------------------------------------------


def test_unauthenticated_access_to_protected_endpoint(client: TestClient):
    """Accessing /api/applications without a token must return 401/403."""
    res = client.get("/api/applications")
    assert res.status_code in (401, 403), (
        f"Expected 401/403 for unauthenticated access, got {res.status_code}"
    )


def test_invalid_jwt_token_rejected(client: TestClient):
    """A tampered/invalid JWT must be rejected with 401/403."""
    bad_headers = {"Authorization": "Bearer this.is.not.a.valid.jwt"}
    res = client.get("/api/applications", headers=bad_headers)
    assert res.status_code in (401, 403), (
        f"Expected 401/403 for bad JWT, got {res.status_code}"
    )


def test_malformed_bearer_header(client: TestClient):
    """A malformed Authorization header (no 'Bearer' prefix) is rejected."""
    res = client.get("/api/applications", headers={"Authorization": "Badscheme token123"})
    assert res.status_code in (401, 403, 422), (
        f"Expected 401/403/422 for malformed auth header, got {res.status_code}"
    )


# ---------------------------------------------------------------------------
# Application resource edge cases
# ---------------------------------------------------------------------------


def test_get_nonexistent_application(client: TestClient):
    """Fetching an application with a fake ID returns 404, not 500."""
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/applications/000000000000000000000000", headers=headers)
    assert res.status_code in (404, 422), (
        f"Expected 404/422 for missing application, got {res.status_code}"
    )


def test_create_application_missing_required_fields(client: TestClient):
    """Creating an application without required fields returns 422."""
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    # Omit 'company' and 'role' which are required
    res = client.post("/api/applications", json={"status": "Applied"}, headers=headers)
    assert res.status_code == 422, (
        f"Expected 422 for missing required fields, got {res.status_code}"
    )


def test_update_nonexistent_application(client: TestClient):
    """PATCH on a non-existent application ID returns 404."""
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(
        "/api/applications/000000000000000000000000",
        json={"status": "Rejected"},
        headers=headers,
    )
    assert res.status_code in (404, 422), (
        f"Expected 404/422 for missing application update, got {res.status_code}"
    )


def test_delete_nonexistent_application(client: TestClient):
    """DELETE on a non-existent application ID returns 404."""
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.delete(
        "/api/applications/000000000000000000000000", headers=headers
    )
    assert res.status_code in (404, 422), (
        f"Expected 404/422 for missing application delete, got {res.status_code}"
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


def test_health_endpoint_always_responds(client: TestClient):
    """Health endpoint must respond 200 without authentication."""
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200 from health check, got {res.status_code}"


def test_root_metadata_endpoint(client: TestClient):
    """Root / endpoint returns app metadata without authentication."""
    res = client.get("/")
    assert res.status_code == 200
    body = res.json()
    assert "name" in body
    assert "status" in body
    assert body["status"] == "online"
