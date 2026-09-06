import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test accounts and tokens
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@sectest\\.io$"}})
        await db.profiles.delete_many({"email": {"$regex": ".*@sectest\\.io$"}})
        await db.revoked_tokens.delete_many({})


@pytest.mark.asyncio
async def test_refresh_token_type_enforcement(client):
    """SEC-01: Ensure access tokens cannot be exchanged for new tokens at /api/auth/refresh."""
    # 1. Register a test user
    reg = await client.post("/api/auth/register", json={
        "name": "Sec Test User",
        "email": "refreshtest@sectest.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg.status_code == 201
    data = reg.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    # 2. Attempt to refresh using ACCESS token -> MUST be rejected with 401
    bad_refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert bad_refresh_res.status_code == 401
    assert "Invalid token type" in bad_refresh_res.json()["message"]

    # 3. Refresh using legitimate REFRESH token -> MUST succeed with 200
    good_refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert good_refresh_res.status_code == 200
    assert "access_token" in good_refresh_res.json()


@pytest.mark.asyncio
async def test_logout_revocation_enforcement(client):
    """SEC-02: Ensure tokens are revoked upon logout and rejected in subsequent requests."""
    # 1. Register and get token
    reg = await client.post("/api/auth/register", json={
        "name": "Logout Tester",
        "email": "logout@sectest.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg.status_code == 201
    access_token = reg.json()["access_token"]

    # 2. Verify token works
    me_res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200

    # 3. Perform logout
    logout_res = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_res.status_code == 200

    # 4. Subsequent requests using the logged-out token MUST return 401
    me_after_logout = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_regex_injection_and_redos_resilience(client):
    """SEC-04: Ensure special regex characters and ReDoS patterns do not crash MongoDB."""
    malicious_inputs = ["[", "*", ".*", "(a+)+", "\\", "{1,}", "^$"]

    for pattern in malicious_inputs:
        # 1. Unified Search
        res_search = await client.get(f"/api/search?q={pattern}")
        assert res_search.status_code == 200, f"Search crashed on query: {pattern}"

        # 2. Jobs search
        res_jobs = await client.get(f"/api/jobs?search={pattern}")
        assert res_jobs.status_code == 200, f"Jobs search crashed on query: {pattern}"

        # 3. Companies search
        res_companies = await client.get(f"/api/companies?query={pattern}")
        assert res_companies.status_code == 200, f"Companies search crashed on query: {pattern}"


@pytest.mark.asyncio
async def test_payload_max_length_validation(client):
    """SEC-07: Ensure oversized payloads are rejected by request validation."""
    # Register user
    reg = await client.post("/api/auth/register", json={
        "name": "Length Tester",
        "email": "length@sectest.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Oversized chat message (> 10,000 chars)
    oversized_msg = "A" * 10001
    res_msg = await client.post(
        "/api/messages/conversations/test_conv/messages",
        json={"content": oversized_msg},
        headers=headers,
    )
    assert res_msg.status_code == 422

    # 2. Oversized feed post (> 15,000 chars)
    oversized_post = "B" * 15001
    res_post = await client.post(
        "/api/feed/posts",
        json={"content": oversized_post, "type": "Technical Discussion"},
        headers=headers,
    )
    assert res_post.status_code == 422

    # 3. Oversized comment (> 3,000 chars)
    oversized_comment = "C" * 3001
    res_comment = await client.post(
        "/api/feed/posts/any_post/comments",
        json={"content": oversized_comment},
        headers=headers,
    )
    assert res_comment.status_code == 422


@pytest.mark.asyncio
async def test_auth_rate_limiter(client):
    """SEC-03: Ensure sliding-window rate limiter returns 429 when threshold exceeded."""
    from app.middleware.rate_limiter import auth_rate_limiter
    # Clear client history for clean test
    auth_rate_limiter.requests.clear()

    # Rapidly fire requests up to threshold
    threshold = auth_rate_limiter.requests_limit
    for _ in range(threshold):
        res = await client.post(
            "/api/auth/login",
            json={"email": "nonexistent@sectest.io", "password": "wrongpassword"},
        )
        assert res.status_code == 401

    # Next request must be throttled with 429
    throttled_res = await client.post(
        "/api/auth/login",
        json={"email": "nonexistent@sectest.io", "password": "wrongpassword"},
    )
    assert throttled_res.status_code == 429
    assert "Retry-After" in throttled_res.headers

    # Clean up state so subsequent test suites aren't throttled
    auth_rate_limiter.requests.clear()
