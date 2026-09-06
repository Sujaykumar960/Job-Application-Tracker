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
    # Clean up test users and profiles
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@authtest\\.io$"}})
        await db.profiles.delete_many({})


@pytest.mark.asyncio
async def test_register_success(client):
    payload = {
        "name": "Jordan Dev",
        "email": "jordan@authtest.io",
        "password": "SecurePassword123!",
        "role": "seeker",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "password" not in data
    assert "passwordHash" not in data
    assert data["user"]["email"] == "jordan@authtest.io"
    assert data["user"]["name"] == "Jordan Dev"
    assert data["user"]["role"] == "seeker"
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {
        "name": "Duplicate User",
        "email": "duplicate@authtest.io",
        "password": "SecurePassword123!",
        "role": "seeker",
    }
    res1 = await client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    err_data = res2.json()
    assert "already exists" in err_data.get("message", "").lower() or "already exists" in str(err_data).lower()


@pytest.mark.asyncio
async def test_register_short_password_validation(client):
    payload = {
        "name": "Short Pw",
        "email": "short@authtest.io",
        "password": "123",  # Less than 8 chars
        "role": "seeker",
    }
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    # Register first
    reg_payload = {
        "name": "Login User",
        "email": "login@authtest.io",
        "password": "StrongPassword999!",
        "role": "seeker",
    }
    await client.post("/api/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "email": "login@authtest.io",
        "password": "StrongPassword999!",
    }
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login@authtest.io"
    assert "passwordHash" not in data["user"]


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    reg_payload = {
        "name": "Target User",
        "email": "target@authtest.io",
        "password": "CorrectPassword123!",
        "role": "seeker",
    }
    await client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "target@authtest.io",
        "password": "WrongPassword999!",
    }
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client):
    login_payload = {
        "email": "nobody@authtest.io",
        "password": "AnyPassword123!",
    }
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_invalid_token(client):
    headers = {"Authorization": "Bearer invalid_tampered_token_xyz"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_auth_me_success(client):
    reg_payload = {
        "name": "Auth Me User",
        "email": "authme@authtest.io",
        "password": "StrongPassword123!",
        "role": "seeker",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "authme@authtest.io"
    assert data["name"] == "Auth Me User"


@pytest.mark.asyncio
async def test_users_me_get_and_patch(client):
    reg_payload = {
        "name": "Taylor Engineer",
        "email": "taylor@authtest.io",
        "password": "StrongPassword123!",
        "role": "seeker",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # GET /api/users/me
    get_res = await client.get("/api/users/me", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["email"] == "taylor@authtest.io"

    # PATCH /api/users/me
    patch_payload = {
        "headline": "Senior Distributed Systems Architect",
        "bio": "Building high-performance actor systems in Go & Rust.",
        "location": "San Francisco, CA",
        "skills": ["Go", "Rust", "Distributed Systems", "Kafka"],
    }
    patch_res = await client.patch("/api/users/me", json=patch_payload, headers=headers)
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["headline"] == "Senior Distributed Systems Architect"
    assert updated["location"] == "San Francisco, CA"
    assert "Rust" in updated["skills"]


@pytest.mark.asyncio
async def test_role_authorization_seeker_blocked_from_recruiter(client):
    reg_payload = {
        "name": "Seeker User",
        "email": "seeker@authtest.io",
        "password": "StrongPassword123!",
        "role": "seeker",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt recruiter-only action: shortlist candidate
    res = await client.post("/api/recruiter/candidates/cand_1/shortlist", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_role_authorization_recruiter_allowed(client):
    reg_payload = {
        "name": "Sarah Recruiter",
        "email": "sarah.recruiter@authtest.io",
        "password": "StrongPassword123!",
        "role": "recruiter",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Recruiter action: shortlist candidate
    res = await client.post("/api/recruiter/candidates/cand_1/shortlist", headers=headers)
    assert res.status_code == 200
    assert res.json()["isShortlisted"] is True


@pytest.mark.asyncio
async def test_token_refresh(client):
    reg_payload = {
        "name": "Refresh User",
        "email": "refresh@authtest.io",
        "password": "StrongPassword123!",
        "role": "seeker",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    refresh_token = reg_res.json()["refresh_token"]

    # Send refresh token in body
    refresh_res = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
