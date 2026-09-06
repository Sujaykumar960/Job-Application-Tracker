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
        await db.connections.delete_many({})
        await db.follows.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@nettest\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, company: str = "Stripe", skills: list = None) -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]

    # Update profile with company and skills
    headers = {"Authorization": f"Bearer {token}"}
    await client.patch("/api/users/me", json={
        "company": company,
        "skills": skills or ["Go", "Distributed Systems"],
    }, headers=headers)

    return user_id, token


@pytest.mark.asyncio
async def test_self_operation_guards(client):
    uid, token = await register_user(client, "self.guard@nettest.io", "Self User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Connect to oneself
    connect_self = await client.post(f"/api/network/users/{uid}/connect", headers=headers)
    assert connect_self.status_code == 400
    assert "cannot connect to themselves" in connect_self.json()["detail"].lower()

    # 2. Follow oneself
    follow_self = await client.post(f"/api/network/users/{uid}/follow", headers=headers)
    assert follow_self.status_code == 400
    assert "cannot follow themselves" in follow_self.json()["detail"].lower()


@pytest.mark.asyncio
async def test_duplicate_connection_request_prevention(client):
    uid_a, token_a = await register_user(client, "alice.dup@nettest.io", "Alice Dup")
    uid_b, token_b = await register_user(client, "bob.dup@nettest.io", "Bob Dup")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Alice sends request to Bob
    req1 = await client.post(
        f"/api/network/users/{uid_b}/connect",
        json={"note": "Let's connect!"},
        headers=headers_a,
    )
    assert req1.status_code == 201

    # 2. Alice attempts to send duplicate request to Bob
    req2 = await client.post(f"/api/network/users/{uid_b}/connect", headers=headers_a)
    assert req2.status_code == 400
    assert "already pending" in req2.json()["detail"].lower()

    # 3. Bob attempts to send reverse request while Alice's is pending
    req3 = await client.post(f"/api/network/users/{uid_a}/connect", headers=headers_b)
    assert req3.status_code == 400
    assert "already pending" in req3.json()["detail"].lower()


@pytest.mark.asyncio
async def test_connection_request_lifecycle_and_authorization(client):
    uid_a, token_a = await register_user(client, "alice.life@nettest.io", "Alice Lifecycle")
    uid_b, token_b = await register_user(client, "bob.life@nettest.io", "Bob Lifecycle")
    uid_c, token_c = await register_user(client, "charlie.life@nettest.io", "Charlie Lifecycle")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Alice sends request with note to Bob
    send_res = await client.post(
        f"/api/network/users/{uid_b}/connect",
        json={"note": "Enjoyed your talk on Kafka partition balancing."},
        headers=headers_a,
    )
    assert send_res.status_code == 201

    # Bob views incoming requests
    requests_res = await client.get("/api/network/requests", headers=headers_b)
    assert requests_res.status_code == 200
    req_list = requests_res.json()
    assert len(req_list) >= 1
    target_req = next((r for r in req_list if r["id"] == uid_a), None)
    assert target_req is not None
    assert target_req["isIncomingRequest"] is True
    assert target_req["note"] == "Enjoyed your talk on Kafka partition balancing."
    request_id = target_req["requestId"]

    # Charlie attempts to accept Alice-Bob request (Forbidden)
    hacked_accept = await client.post(f"/api/network/requests/{request_id}/accept", headers=headers_c)
    assert hacked_accept.status_code == 403

    # Charlie attempts to reject Alice-Bob request (Forbidden)
    hacked_reject = await client.post(f"/api/network/requests/{request_id}/reject", headers=headers_c)
    assert hacked_reject.status_code == 403

    # Bob accepts request
    accept_res = await client.post(f"/api/network/requests/{request_id}/accept", headers=headers_b)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "Connected"

    # Both Alice and Bob now see each other in connections
    conn_a = await client.get("/api/network/connections", headers=headers_a)
    assert conn_a.status_code == 200
    assert any(c["id"] == uid_b and c["connectionState"] == "Connected" for c in conn_a.json())

    conn_b = await client.get("/api/network/connections", headers=headers_b)
    assert conn_b.status_code == 200
    assert any(c["id"] == uid_a and c["connectionState"] == "Connected" for c in conn_b.json())

    # Connecting when already connected returns 400
    conn_again = await client.post(f"/api/network/users/{uid_b}/connect", headers=headers_a)
    assert conn_again.status_code == 400
    assert "already connected" in conn_again.json()["detail"].lower()


@pytest.mark.asyncio
async def test_disconnect_flow(client):
    uid_a, token_a = await register_user(client, "alice.disc@nettest.io", "Alice Disc")
    uid_b, token_b = await register_user(client, "bob.disc@nettest.io", "Bob Disc")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Connect
    await client.post(f"/api/network/users/{uid_b}/connect", headers=headers_a)
    requests = (await client.get("/api/network/requests", headers=headers_b)).json()
    req_id = requests[0]["requestId"]
    await client.post(f"/api/network/requests/{req_id}/accept", headers=headers_b)

    # Disconnect
    disc_res = await client.delete(f"/api/network/connections/{uid_b}", headers=headers_a)
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True

    # Both now have empty connections
    conn_a = (await client.get("/api/network/connections", headers=headers_a)).json()
    assert not any(c["id"] == uid_b for c in conn_a)


@pytest.mark.asyncio
async def test_real_mutual_connections(client):
    uid_a, token_a = await register_user(client, "alice.mut@nettest.io", "Alice Mut")
    uid_b, token_b = await register_user(client, "bob.mut@nettest.io", "Bob Mut")
    uid_c, token_c = await register_user(client, "charlie.mut@nettest.io", "Charlie Mut")
    uid_d, token_d = await register_user(client, "david.mut@nettest.io", "David Mut")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Alice connects with Bob
    await client.post(f"/api/network/users/{uid_b}/connect", headers=headers_a)
    req_b = (await client.get("/api/network/requests", headers=headers_b)).json()[0]["requestId"]
    await client.post(f"/api/network/requests/{req_b}/accept", headers=headers_b)

    # Charlie connects with Bob
    await client.post(f"/api/network/users/{uid_b}/connect", headers=headers_c)
    req_b2 = (await client.get("/api/network/requests", headers=headers_b)).json()[0]["requestId"]
    await client.post(f"/api/network/requests/{req_b2}/accept", headers=headers_b)

    # When Alice views Charlie: Bob is a mutual connection!
    users_view = (await client.get(f"/api/network/users?search=Charlie", headers=headers_a)).json()
    charlie_card = next((u for u in users_view if u["id"] == uid_c), None)
    assert charlie_card is not None
    assert charlie_card["mutualCount"] == 1
    assert "Bob Mut" in charlie_card["mutualNames"]

    # When Alice views David (no shared friends): mutualCount must be 0!
    david_view = (await client.get(f"/api/network/users?search=David", headers=headers_a)).json()
    david_card = next((u for u in david_view if u["id"] == uid_d), None)
    assert david_card is not None
    assert david_card["mutualCount"] == 0
    assert david_card["mutualNames"] == []


@pytest.mark.asyncio
async def test_suggestions_engine(client):
    uid_a, token_a = await register_user(
        client, "alice.sug@nettest.io", "Alice Sug", company="Linear", skills=["TypeScript", "React", "GraphQL"]
    )
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Best peer: shares company and skills
    uid_best, _ = await register_user(
        client, "best.peer@nettest.io", "Best Peer", company="Linear", skills=["TypeScript", "React", "Rust"]
    )

    # Low match peer: different company and skills
    uid_low, _ = await register_user(
        client, "low.peer@nettest.io", "Low Peer", company="LegacyCorp", skills=["Java", "COBOL"]
    )

    sug_res = await client.get("/api/network/suggestions", headers=headers_a)
    assert sug_res.status_code == 200
    suggestions = sug_res.json()
    assert len(suggestions) >= 2

    # Best peer should be ranked before low match peer
    best_idx = next(i for i, u in enumerate(suggestions) if u["id"] == uid_best)
    low_idx = next(i for i, u in enumerate(suggestions) if u["id"] == uid_low)
    assert best_idx < low_idx


@pytest.mark.asyncio
async def test_follow_unfollow_operations(client):
    uid_a, token_a = await register_user(client, "alice.fol@nettest.io", "Alice Follower")
    uid_b, token_b = await register_user(client, "bob.fol@nettest.io", "Bob Leader")

    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Follow Bob
    follow_res = await client.post(f"/api/network/users/{uid_b}/follow", headers=headers_a)
    assert follow_res.status_code == 200
    assert follow_res.json()["following"] is True

    # Check directory view
    users = (await client.get(f"/api/network/users?search=Bob+Leader", headers=headers_a)).json()
    bob_card = next((u for u in users if u["id"] == uid_b), None)
    assert bob_card is not None
    assert bob_card["isFollowing"] is True

    # Unfollow Bob
    unfollow_res = await client.delete(f"/api/network/users/{uid_b}/follow", headers=headers_a)
    assert unfollow_res.status_code == 200
    assert unfollow_res.json()["following"] is False

    # Check directory view again
    users_after = (await client.get(f"/api/network/users?search=Bob+Leader", headers=headers_a)).json()
    bob_after = next((u for u in users_after if u["id"] == uid_b), None)
    assert bob_after is not None
    assert bob_after["isFollowing"] is False
