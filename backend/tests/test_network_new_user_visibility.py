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
    # Clean up test users
    db = DatabaseManager.db
    if db is not None:
        test_users = await db.users.find({"email": {"$regex": ".*@netvis\\.io$"}}, {"_id": 1, "id": 1}).to_list(500)
        test_uids = [str(u.get("id") or u["_id"]) for u in test_users]
        if test_uids:
            await db.profiles.delete_many({"userId": {"$in": test_uids}})
            await db.connections.delete_many({"$or": [{"requesterId": {"$in": test_uids}}, {"receiverId": {"$in": test_uids}}]})
            await db.connection_requests.delete_many({"$or": [{"senderId": {"$in": test_uids}}, {"recipientId": {"$in": test_uids}}]})
            await db.follows.delete_many({"$or": [{"followerId": {"$in": test_uids}}, {"targetUserId": {"$in": test_uids}}]})
            await db.notifications.delete_many({"userId": {"$in": test_uids}})
            await db.users.delete_many({"_id": {"$in": [u["_id"] for u in test_users]}})


@pytest.mark.asyncio
async def test_new_user_registration_and_login_shows_to_other_candidates(client):
    """When a new user registers or logs in, their profile immediately shows to all other candidates in /network/discover."""
    # 1. Existing candidate: Alice
    reg_alice = await client.post("/api/auth/register", json={
        "name": "Alice Candidate",
        "email": "alice.existing@netvis.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg_alice.status_code == 201
    alice_token = reg_alice.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. New candidate registers: Bob NewUser
    reg_bob = await client.post("/api/auth/register", json={
        "name": "Bob NewUser",
        "email": "bob.newuser@netvis.io",
        "password": "Password123!",
        "role": "seeker",
    })
    assert reg_bob.status_code == 201
    bob_id = reg_bob.json()["user"]["id"]

    # 3. Alice fetches /network/discover -> Bob NewUser MUST be visible!
    res_alice = await client.get("/api/network/discover", headers=alice_headers)
    assert res_alice.status_code == 200
    network_users = res_alice.json()
    bob_card = next((u for u in network_users if u["id"] == bob_id), None)
    assert bob_card is not None, "Newly registered user Bob must show up in Alice's network section!"
    assert bob_card["name"] == "Bob NewUser"
    assert bob_card["headline"] == "Software Engineer"
    assert bob_card["location"] == "Remote"
    assert bob_card["connectionState"] == "Connect"

    # 4. Another user: Charlie logs in
    reg_charlie = await client.post("/api/auth/register", json={
        "name": "Charlie Recruiter",
        "email": "charlie.recruiter@netvis.io",
        "password": "Password123!",
        "role": "recruiter",
    })
    assert reg_charlie.status_code == 201
    charlie_id = reg_charlie.json()["user"]["id"]

    # Charlie logs in via /auth/login
    login_res = await client.post("/api/auth/login", json={
        "email": "charlie.recruiter@netvis.io",
        "password": "Password123!",
    })
    assert login_res.status_code == 200
    charlie_token = login_res.json()["access_token"]
    charlie_headers = {"Authorization": f"Bearer {charlie_token}"}

    # Both Alice and Bob must see Charlie in their network section!
    res_for_bob = await client.get("/api/network/discover", headers={"Authorization": f"Bearer {reg_bob.json()['access_token']}"})
    assert res_for_bob.status_code == 200
    charlie_in_bob_view = next((u for u in res_for_bob.json() if u["id"] == charlie_id), None)
    assert charlie_in_bob_view is not None, "Charlie must show up in Bob's network section after login!"
    assert charlie_in_bob_view["name"] == "Charlie Recruiter"

    # 5. Bob updates his profile
    update_res = await client.patch("/api/users/me", json={
        "name": "Robert Senior Engineer",
        "headline": "Lead Distributed Systems Architect",
        "location": "New York, NY",
        "company": "CloudScale",
    }, headers={"Authorization": f"Bearer {reg_bob.json()['access_token']}"})
    assert update_res.status_code == 200

    # Charlie views network -> Bob's updated profile is immediately visible!
    res_for_charlie = await client.get("/api/network/discover", headers=charlie_headers)
    assert res_for_charlie.status_code == 200
    bob_in_charlie_view = next((u for u in res_for_charlie.json() if u["id"] == bob_id), None)
    assert bob_in_charlie_view is not None
    assert bob_in_charlie_view["name"] == "Robert Senior Engineer"
    assert bob_in_charlie_view["headline"] == "Lead Distributed Systems Architect"
    assert bob_in_charlie_view["location"] == "New York, NY"
