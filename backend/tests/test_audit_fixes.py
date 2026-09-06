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
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.applications.delete_many({"company": {"$regex": ".*Audit.*"}})
        await db.calendar_events.delete_many({"title": {"$regex": ".*Test.*"}})
        await db.users.delete_many({"email": {"$regex": ".*@audit\\.io$"}})
        await db.profiles.delete_many({"email": {"$regex": ".*@audit\\.io$"}})


@pytest.mark.asyncio
async def test_application_status_normalization(client):
    # 1. Register test seeker
    reg = await client.post("/api/auth/register", json={
        "name": "Audit Seeker",
        "email": "seeker@audit.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Post application with status="interviewing" (should be normalized to "Interview")
    res1 = await client.post("/api/applications", json={
        "company": "Audit Interview Corp",
        "role": "Distributed Systems Engineer",
        "status": "interviewing",
    }, headers=headers)
    assert res1.status_code == 201
    assert res1.json()["status"] == "Interview"

    # 3. Post application with status="offered" (should be normalized to "Offer")
    res2 = await client.post("/api/applications", json={
        "company": "Audit Offer Corp",
        "role": "Platform Engineer",
        "status": "offered",
    }, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["status"] == "Offer"

    # 4. Post application with status="wishlist" (should be accepted as "Wishlist")
    res3 = await client.post("/api/applications", json={
        "company": "Audit Wishlist Corp",
        "role": "Infrastructure Engineer",
        "status": "wishlist",
    }, headers=headers)
    assert res3.status_code == 201
    assert res3.json()["status"] == "Wishlist"

    # 5. Patch application with status="interviewing"
    app_id = res3.json()["id"]
    patch_res = await client.patch(f"/api/applications/{app_id}", json={
        "status": "interviewing",
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Interview"


@pytest.mark.asyncio
async def test_auth_password_reset_flow(client, monkeypatch):
    from app.routers import auth as auth_router
    from app.database import DatabaseManager

    # 1. Register user
    reg = await client.post("/api/auth/register", json={
        "name": "Reset Tester",
        "email": "reset@audit.io",
        "password": "InitialPassword123!",
        "role": "seeker",
    })
    assert reg.status_code == 201

    # 2. Forgot password request. The delivery system is mocked in tests;
    #    the API response must never disclose the token.
    reset_token = "test-only-reset-token"
    monkeypatch.setattr(auth_router.secrets, "token_urlsafe", lambda _: reset_token)
    forgot = await client.post("/api/auth/forgot-password", json={
        "email": "reset@audit.io",
    })
    assert forgot.status_code == 200
    msg = forgot.json()["message"]
    assert "token for local testing:" not in msg.lower()

    stored_user = await DatabaseManager.db.users.find_one({"email": "reset@audit.io"})
    assert stored_user["resetTokenHash"]
    assert stored_user["resetTokenHash"] != reset_token
    assert stored_user["resetTokenExpiresAt"]

    # 3. Reset password with new password
    new_password = "BrandNewPassword123!"
    reset = await client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": new_password,
    })
    assert reset.status_code == 200
    assert reset.json()["success"] is True

    reused_reset = await client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "AnotherPassword123!",
    })
    assert reused_reset.status_code == 400

    # 4. Login with old password fails
    old_login = await client.post("/api/auth/login", json={
        "email": "reset@audit.io",
        "password": "InitialPassword123!",
    })
    assert old_login.status_code == 401

    # 5. Login with new password succeeds
    new_login = await client.post("/api/auth/login", json={
        "email": "reset@audit.io",
        "password": new_password,
    })
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()
    assert new_login.json()["token"] == new_login.json()["access_token"]


@pytest.mark.asyncio
async def test_calendar_endpoints_and_google_sync(client):
    # 1. Create a calendar event
    create_res = await client.post("/api/calendar/events", json={
        "title": "Test Architecture Review",
        "type": "Interview",
        "date": "2026-09-15",
        "time": "10:30 AM",
        "company": "Test Linear",
        "locationOrUrl": "https://meet.google.com/test",
        "notes": "Testing calendar sync functionality.",
    })
    assert create_res.status_code == 201
    evt = create_res.json()
    assert evt["title"] == "Test Architecture Review"
    assert evt["company"] == "Test Linear"
    assert "id" in evt

    # 2. Retrieve calendar events
    get_res = await client.get("/api/calendar/events")
    assert get_res.status_code == 200
    events = get_res.json()
    assert isinstance(events, list)
    assert any(e["id"] == evt["id"] for e in events)

    # 3. Trigger Google Calendar sync
    sync_res = await client.post("/api/calendar/google/sync")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["success"] is True
    assert sync_data["syncedCount"] >= 1
    assert "lastSyncedAt" in sync_data
    assert "accountEmail" in sync_data
