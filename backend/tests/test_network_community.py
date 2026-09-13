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
        await db.connection_requests.delete_many({})
        await db.follows.delete_many({})
        await db.posts.delete_many({"content": {"$regex": ".*netcomm.*"}})
        await db.notifications.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@netcomm\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(
    client,
    email: str,
    name: str,
    role: str = "seeker",
    company: str = "Acme Corp",
    skills: list = None,
    location: str = "San Francisco, CA",
) -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    data = res.json()
    token = data["access_token"]
    user_id = data["user"]["id"]

    # Update profile with public details
    headers = {"Authorization": f"Bearer {token}"}
    await client.patch("/api/users/me", json={
        "headline": f"Staff Engineer at {company}",
        "company": company,
        "location": location,
        "skills": skills or ["Python", "Distributed Systems"],
    }, headers=headers)

    return user_id, token


# 1. Anonymous Access Enforcement
@pytest.mark.asyncio
async def test_unauthenticated_requests_blocked_401(client):
    """Anonymous access to private network mutations and queries must yield 401."""
    endpoints = [
        ("GET", "/api/network"),
        ("GET", "/api/network/discover"),
        ("GET", "/api/network/requests"),
        ("GET", "/api/network/connections"),
        ("POST", "/api/network/requests"),
        ("POST", "/api/network/requests/req_fake/accept"),
        ("POST", "/api/network/requests/req_fake/reject"),
        ("DELETE", "/api/network/requests/req_fake"),
        ("DELETE", "/api/network/connections/usr_fake"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = await client.get(path)
        elif method == "POST":
            res = await client.post(path, json={"recipientId": "fake"})
        elif method == "DELETE":
            res = await client.delete(path)
        assert res.status_code == 401, f"{method} {path} expected 401, got {res.status_code}"


# 2. Self-Connection Guard
@pytest.mark.asyncio
async def test_self_connection_blocked_400(client):
    """A user cannot send a connection request to themselves."""
    alice_id, alice_token = await register_user(client, "alice.self@netcomm.io", "Alice Self")
    headers = {"Authorization": f"Bearer {alice_token}"}

    res = await client.post("/api/network/requests", json={"recipientId": alice_id}, headers=headers)
    assert res.status_code == 400
    assert "themselves" in res.json()["detail"].lower() or "self" in res.json()["detail"].lower()


# 3. Duplicate Pending Connection Request Prevention
@pytest.mark.asyncio
async def test_duplicate_pending_connection_blocked_400(client):
    """Sending a second pending request to the same recipient returns 400."""
    alice_id, alice_token = await register_user(client, "alice.dup@netcomm.io", "Alice Dup")
    bob_id, _ = await register_user(client, "bob.dup@netcomm.io", "Bob Dup")
    headers = {"Authorization": f"Bearer {alice_token}"}

    first = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers=headers)
    assert second.status_code == 400
    assert "already pending" in second.json()["detail"].lower()


# 4. Reverse Pending Connection Request Prevention
@pytest.mark.asyncio
async def test_reverse_pending_connection_blocked_400(client):
    """When A has sent a pending request to B, B cannot send a new request back to A."""
    alice_id, alice_token = await register_user(client, "alice.rev@netcomm.io", "Alice Rev")
    bob_id, bob_token = await register_user(client, "bob.rev@netcomm.io", "Bob Rev")

    res_a = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert res_a.status_code == 201

    res_b = await client.post("/api/network/requests", json={"recipientId": alice_id}, headers={"Authorization": f"Bearer {bob_token}"})
    assert res_b.status_code == 400
    assert "already pending" in res_b.json()["detail"].lower()


# 5. Already Connected Request Prevention
@pytest.mark.asyncio
async def test_already_connected_request_blocked_400(client):
    """When A and B are already connected, attempting to send another connection request returns 400."""
    alice_id, alice_token = await register_user(client, "alice.conn@netcomm.io", "Alice Conn")
    bob_id, bob_token = await register_user(client, "bob.conn@netcomm.io", "Bob Conn")

    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    accept_res = await client.post(f"/api/network/requests/{req_id}/accept", headers={"Authorization": f"Bearer {bob_token}"})
    assert accept_res.status_code == 200

    # Alice tries to connect again
    again_a = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert again_a.status_code == 400
    assert "already connected" in again_a.json()["detail"].lower()

    # Bob tries to connect again
    again_b = await client.post("/api/network/requests", json={"recipientId": alice_id}, headers={"Authorization": f"Bearer {bob_token}"})
    assert again_b.status_code == 400
    assert "already connected" in again_b.json()["detail"].lower()


# 6. Cross-User Accept Forbidden (403)
@pytest.mark.asyncio
async def test_cross_user_accept_blocked_403(client):
    """Only the intended recipient can accept a connection request; 3rd party gets 403."""
    _, alice_token = await register_user(client, "alice.xacc@netcomm.io", "Alice XAcc")
    bob_id, _ = await register_user(client, "bob.xacc@netcomm.io", "Bob XAcc")
    _, charlie_token = await register_user(client, "charlie.xacc@netcomm.io", "Charlie XAcc")

    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Charlie attempts to accept
    hacked = await client.post(f"/api/network/requests/{req_id}/accept", headers={"Authorization": f"Bearer {charlie_token}"})
    assert hacked.status_code == 403
    assert "recipient" in hacked.json()["detail"].lower()


# 7. Cross-User Reject Forbidden (403)
@pytest.mark.asyncio
async def test_cross_user_reject_blocked_403(client):
    """Only the intended recipient can reject a connection request; 3rd party or sender gets 403."""
    _, alice_token = await register_user(client, "alice.xrej@netcomm.io", "Alice XRej")
    bob_id, _ = await register_user(client, "bob.xrej@netcomm.io", "Bob XRej")
    _, charlie_token = await register_user(client, "charlie.xrej@netcomm.io", "Charlie XRej")

    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Charlie attempts to reject
    hacked = await client.post(f"/api/network/requests/{req_id}/reject", headers={"Authorization": f"Bearer {charlie_token}"})
    assert hacked.status_code == 403

    # Alice (sender) attempts to reject
    sender_reject = await client.post(f"/api/network/requests/{req_id}/reject", headers={"Authorization": f"Bearer {alice_token}"})
    assert sender_reject.status_code == 403


# 8. Cross-User Cancel Forbidden (403)
@pytest.mark.asyncio
async def test_cross_user_cancel_blocked_403(client):
    """Only the sender can cancel a pending connection request; recipient or 3rd party gets 403."""
    _, alice_token = await register_user(client, "alice.xcan@netcomm.io", "Alice XCan")
    bob_id, bob_token = await register_user(client, "bob.xcan@netcomm.io", "Bob XCan")
    _, charlie_token = await register_user(client, "charlie.xcan@netcomm.io", "Charlie XCan")

    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Bob (recipient) attempts to cancel
    res_bob = await client.delete(f"/api/network/requests/{req_id}", headers={"Authorization": f"Bearer {bob_token}"})
    assert res_bob.status_code == 403
    assert "sender" in res_bob.json()["detail"].lower()

    # Charlie (third-party) attempts to cancel
    res_charlie = await client.delete(f"/api/network/requests/{req_id}", headers={"Authorization": f"Bearer {charlie_token}"})
    assert res_charlie.status_code == 403


# 9. Sender Cancel Pending Request Lifecycle
@pytest.mark.asyncio
async def test_sender_cancel_pending_request_lifecycle(client):
    """Sender can cancel a pending request, resetting the state and request counts."""
    alice_id, alice_token = await register_user(client, "alice.cancel@netcomm.io", "Alice Cancel")
    bob_id, bob_token = await register_user(client, "bob.cancel@netcomm.io", "Bob Cancel")

    # Alice sends request
    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Bob sees incoming request
    bob_reqs = await client.get("/api/network/requests", headers={"Authorization": f"Bearer {bob_token}"})
    assert any(r["id"] == alice_id for r in bob_reqs.json())

    # Check network summary before cancel
    sum_a = await client.get("/api/network", headers={"Authorization": f"Bearer {alice_token}"})
    assert sum_a.json()["pendingOutgoingCount"] >= 1
    sum_b = await client.get("/api/network", headers={"Authorization": f"Bearer {bob_token}"})
    assert sum_b.json()["pendingIncomingCount"] >= 1

    # Alice cancels request
    cancel_res = await client.delete(f"/api/network/requests/{req_id}", headers={"Authorization": f"Bearer {alice_token}"})
    assert cancel_res.status_code == 200

    # Bob no longer sees incoming request
    bob_reqs_after = await client.get("/api/network/requests", headers={"Authorization": f"Bearer {bob_token}"})
    assert not any(r["id"] == alice_id for r in bob_reqs_after.json())

    # Alice summary updated
    sum_a_after = await client.get("/api/network", headers={"Authorization": f"Bearer {alice_token}"})
    assert sum_a_after.json()["pendingOutgoingCount"] == 0

    # Alice can now re-send without 400
    resend = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert resend.status_code == 201


# 10. Accept Request Creates 1st-Degree Connection
@pytest.mark.asyncio
async def test_accept_request_creates_first_degree_connection(client):
    """Accepting a connection request persists 1st-degree connection for both users."""
    alice_id, alice_token = await register_user(client, "alice.acc@netcomm.io", "Alice Accept")
    bob_id, bob_token = await register_user(client, "bob.acc@netcomm.io", "Bob Accept")

    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    accept_res = await client.post(f"/api/network/requests/{req_id}/accept", headers={"Authorization": f"Bearer {bob_token}"})
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] in ("Connected", "accepted")

    # Alice sees Bob in connections
    conn_a = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {alice_token}"})
    assert conn_a.status_code == 200
    assert any(c["id"] == bob_id for c in conn_a.json())

    # Bob sees Alice in connections
    conn_b = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {bob_token}"})
    assert conn_b.status_code == 200
    assert any(c["id"] == alice_id for c in conn_b.json())

    # Summaries reflect active connection
    sum_a = await client.get("/api/network", headers={"Authorization": f"Bearer {alice_token}"})
    assert sum_a.json()["totalConnections"] >= 1
    sum_b = await client.get("/api/network", headers={"Authorization": f"Bearer {bob_token}"})
    assert sum_b.json()["totalConnections"] >= 1


# 11. Disconnect Removes 1st-Degree Connection
@pytest.mark.asyncio
async def test_disconnect_removes_first_degree_connection(client):
    """Removing a connection deletes the 1st-degree bond symmetrically."""
    alice_id, alice_token = await register_user(client, "alice.disc@netcomm.io", "Alice Disc")
    bob_id, bob_token = await register_user(client, "bob.disc@netcomm.io", "Bob Disc")

    # Connect Alice and Bob
    req = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    req_id = req.json()["id"]
    await client.post(f"/api/network/requests/{req_id}/accept", headers={"Authorization": f"Bearer {bob_token}"})

    # Disconnect
    disc = await client.delete(f"/api/network/connections/{bob_id}", headers={"Authorization": f"Bearer {alice_token}"})
    assert disc.status_code == 200
    assert disc.json()["success"] is True

    # Check Alice connections
    conn_a = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {alice_token}"})
    assert not any(c["id"] == bob_id for c in conn_a.json())

    # Check Bob connections
    conn_b = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {bob_token}"})
    assert not any(c["id"] == alice_id for c in conn_b.json())


# 12. Cross-User Disconnect Isolation
@pytest.mark.asyncio
async def test_cross_user_disconnect_isolated(client):
    """Disconnecting from User B does not affect User C's connection with Alice."""
    alice_id, alice_token = await register_user(client, "alice.iso@netcomm.io", "Alice Iso")
    bob_id, bob_token = await register_user(client, "bob.iso@netcomm.io", "Bob Iso")
    charlie_id, charlie_token = await register_user(client, "charlie.iso@netcomm.io", "Charlie Iso")

    # Alice connects with Bob
    req1 = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    await client.post(f"/api/network/requests/{req1.json()['id']}/accept", headers={"Authorization": f"Bearer {bob_token}"})

    # Alice connects with Charlie
    req2 = await client.post("/api/network/requests", json={"recipientId": charlie_id}, headers={"Authorization": f"Bearer {alice_token}"})
    await client.post(f"/api/network/requests/{req2.json()['id']}/accept", headers={"Authorization": f"Bearer {charlie_token}"})

    # Alice disconnects Bob
    await client.delete(f"/api/network/connections/{bob_id}", headers={"Authorization": f"Bearer {alice_token}"})

    # Charlie is still connected to Alice
    conn_c = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {charlie_token}"})
    assert any(c["id"] == alice_id for c in conn_c.json())

    # Alice is still connected to Charlie
    conn_a = await client.get("/api/network/connections", headers={"Authorization": f"Bearer {alice_token}"})
    assert any(c["id"] == charlie_id for c in conn_a.json())
    assert not any(c["id"] == bob_id for c in conn_a.json())


# 13. Discovery Search & Privacy Sanitization
@pytest.mark.asyncio
async def test_discovery_search_and_privacy(client):
    """User discovery endpoint returns public fields only and never leaks private attributes."""
    diana_id, _ = await register_user(
        client,
        "diana.privacy@netcomm.io",
        "Diana Prince",
        role="seeker",
        company="Themyscira Tech",
        skills=["Cryptography", "Security Architecture"],
        location="Washington, DC",
    )
    _, clark_token = await register_user(
        client,
        "clark.privacy@netcomm.io",
        "Clark Kent",
        role="seeker",
        company="Daily Planet",
        skills=["Writing", "Investigative"],
        location="Metropolis",
    )

    res = await client.get("/api/network/discover?search=Diana", headers={"Authorization": f"Bearer {clark_token}"})
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 1

    diana_card = next((u for u in users if u["id"] == diana_id), None)
    assert diana_card is not None
    assert diana_card["name"] == "Diana Prince"
    assert "Cryptography" in diana_card["skills"]

    # Security verification: ensure private fields are stripped across all items
    for item in users:
        assert "password" not in item
        assert "hashed_password" not in item
        assert "passwordHash" not in item
        assert "resumeId" not in item
        assert "applications" not in item
        assert "auth_tokens" not in item


# 14. Discovery Multi-Attribute Filters
@pytest.mark.asyncio
async def test_discovery_filters(client):
    """Discovery filtering by role, skills, and location works accurately."""
    evan_id, _ = await register_user(
        client,
        "evan.filter@netcomm.io",
        "Evan Filter",
        role="seeker",
        company="SoundCloud",
        skills=["Rust", "AudioDSP"],
        location="Berlin",
    )
    fiona_id, _ = await register_user(
        client,
        "fiona.filter@netcomm.io",
        "Fiona Filter",
        role="recruiter",
        company="Revolut",
        skills=["TechRecruiting", "Sourcing"],
        location="London",
    )
    _, viewer_token = await register_user(
        client,
        "viewer.filter@netcomm.io",
        "Viewer Filter",
        role="seeker",
        company="Independent",
        skills=["C++"],
        location="Dublin",
    )

    headers = {"Authorization": f"Bearer {viewer_token}"}

    # 1. Filter by skills=Rust
    res_skill = await client.get("/api/network/discover?skills=Rust", headers=headers)
    assert res_skill.status_code == 200
    ids_skill = [u["id"] for u in res_skill.json()]
    assert evan_id in ids_skill
    assert fiona_id not in ids_skill

    # 2. Filter by role=recruiter
    res_role = await client.get("/api/network/discover?role=recruiter", headers=headers)
    assert res_role.status_code == 200
    ids_role = [u["id"] for u in res_role.json()]
    assert fiona_id in ids_role
    assert evan_id not in ids_role

    # 3. Filter by location=Berlin
    res_loc = await client.get("/api/network/discover?location=Berlin", headers=headers)
    assert res_loc.status_code == 200
    ids_loc = [u["id"] for u in res_loc.json()]
    assert evan_id in ids_loc
    assert fiona_id not in ids_loc


# 15. Connection Notifications Dispatch
@pytest.mark.asyncio
async def test_connection_notifications_dispatch(client):
    """Sending a connection request and accepting it triggers real notifications."""
    alice_id, alice_token = await register_user(client, "alice.notif@netcomm.io", "Alice Notif")
    bob_id, bob_token = await register_user(client, "bob.notif@netcomm.io", "Bob Notif")

    # Alice sends request -> Bob receives notification
    req_res = await client.post("/api/network/requests", json={"recipientId": bob_id}, headers={"Authorization": f"Bearer {alice_token}"})
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    notifs_bob = await client.get("/api/notifications", headers={"Authorization": f"Bearer {bob_token}"})
    assert notifs_bob.status_code == 200
    assert any(n["category"] == "connection_request" for n in notifs_bob.json())

    # Bob accepts request -> Alice receives notification
    accept_res = await client.post(f"/api/network/requests/{req_id}/accept", headers={"Authorization": f"Bearer {bob_token}"})
    assert accept_res.status_code == 200

    notifs_alice = await client.get("/api/notifications", headers={"Authorization": f"Bearer {alice_token}"})
    assert notifs_alice.status_code == 200
    assert any(n["category"] == "connection_accepted" for n in notifs_alice.json())


# 16. Post Ownership Edit/Delete Authorization
@pytest.mark.asyncio
async def test_post_ownership_edit_delete_authorization(client):
    """Non-authors cannot edit or delete someone else's community post (403)."""
    _, alice_token = await register_user(client, "alice.postown@netcomm.io", "Alice PostOwner")
    _, bob_token = await register_user(client, "bob.postown@netcomm.io", "Bob PostOwner")

    # Alice creates post
    create_res = await client.post("/api/feed/posts", json={
        "content": "netcomm_alice_exclusive_post: High throughput event architecture",
        "type": "Technical Discussion",
        "tags": ["netcomm", "architecture"],
    }, headers={"Authorization": f"Bearer {alice_token}"})
    assert create_res.status_code == 201
    post_id = create_res.json()["id"]

    # Bob attempts to edit Alice's post
    edit_bob = await client.patch(f"/api/feed/posts/{post_id}", json={
        "content": "netcomm_hacked_content",
    }, headers={"Authorization": f"Bearer {bob_token}"})
    assert edit_bob.status_code == 403

    # Bob attempts to delete Alice's post
    del_bob = await client.delete(f"/api/feed/posts/{post_id}", headers={"Authorization": f"Bearer {bob_token}"})
    assert del_bob.status_code == 403

    # Alice successfully updates
    edit_alice = await client.patch(f"/api/feed/posts/{post_id}", json={
        "content": "netcomm_alice_exclusive_post: Updated with benchmarks",
    }, headers={"Authorization": f"Bearer {alice_token}"})
    assert edit_alice.status_code == 200

    # Alice successfully deletes
    del_alice = await client.delete(f"/api/feed/posts/{post_id}", headers={"Authorization": f"Bearer {alice_token}"})
    assert del_alice.status_code == 200


# 17. Comment Ownership & Deletion Authorization
@pytest.mark.asyncio
async def test_comment_ownership_delete_authorization(client):
    """Third parties cannot delete another user's comment (403); commenter can delete (200)."""
    _, alice_token = await register_user(client, "alice.comm@netcomm.io", "Alice CommOwner")
    _, bob_token = await register_user(client, "bob.comm@netcomm.io", "Bob CommOwner")
    _, charlie_token = await register_user(client, "charlie.comm@netcomm.io", "Charlie CommOwner")

    # Alice creates post
    post_res = await client.post("/api/feed/posts", json={
        "content": "netcomm_discussion: What is your favorite consensus algorithm?",
        "type": "Technical Discussion",
    }, headers={"Authorization": f"Bearer {alice_token}"})
    post_id = post_res.json()["id"]

    # Bob adds comment
    comm_res = await client.post(f"/api/feed/posts/{post_id}/comments", json={
        "content": "Raft is wonderfully intuitive compared to Paxos!",
    }, headers={"Authorization": f"Bearer {bob_token}"})
    assert comm_res.status_code == 201
    comment_id = comm_res.json()["id"]

    # Charlie attempts to delete Bob's comment (Forbidden 403)
    del_charlie = await client.delete(f"/api/feed/comments/{comment_id}", headers={"Authorization": f"Bearer {charlie_token}"})
    assert del_charlie.status_code == 403

    # Bob deletes his own comment
    del_bob = await client.delete(f"/api/feed/comments/{comment_id}", headers={"Authorization": f"Bearer {bob_token}"})
    assert del_bob.status_code == 200


# 18. Post Likes Idempotency & Notifications
@pytest.mark.asyncio
async def test_post_like_idempotency_and_notification(client):
    """Liking a post dispatches a notification to the author; unliking/liking is deterministic."""
    alice_id, alice_token = await register_user(client, "alice.likes@netcomm.io", "Alice LikesAuthor")
    _, bob_token = await register_user(client, "bob.likes@netcomm.io", "Bob Liker")

    # Alice creates post
    post_res = await client.post("/api/feed/posts", json={
        "content": "netcomm_post: Deep dive into zero-copy network buffers.",
        "type": "Technical Discussion",
    }, headers={"Authorization": f"Bearer {alice_token}"})
    post_id = post_res.json()["id"]

    # Bob likes post
    like_res = await client.post(f"/api/feed/posts/{post_id}/like", headers={"Authorization": f"Bearer {bob_token}"})
    assert like_res.status_code == 200
    assert like_res.json()["likesCount"] == 1
    assert like_res.json()["isLiked"] is True

    # Alice receives post_like notification
    notifs_alice = await client.get("/api/notifications", headers={"Authorization": f"Bearer {alice_token}"})
    assert notifs_alice.status_code == 200
    assert any(n["category"] == "post_like" for n in notifs_alice.json())

    # Bob unlikes post
    unlike_res = await client.delete(f"/api/feed/posts/{post_id}/like", headers={"Authorization": f"Bearer {bob_token}"})
    assert unlike_res.status_code == 200
    assert unlike_res.json()["likesCount"] == 0
    assert unlike_res.json()["isLiked"] is False


# 19. Saved Posts Per-User Isolation
@pytest.mark.asyncio
async def test_saved_posts_user_isolation(client):
    """Bookmarks/Saved posts are strictly isolated to the saving user."""
    _, alice_token = await register_user(client, "alice.saved@netcomm.io", "Alice SavedAuthor")
    _, bob_token = await register_user(client, "bob.saved@netcomm.io", "Bob Saver")
    _, charlie_token = await register_user(client, "charlie.saved@netcomm.io", "Charlie NonSaver")

    # Alice creates post
    post_res = await client.post("/api/feed/posts", json={
        "content": "netcomm_post: Micro-benchmarking jemalloc vs glibc malloc.",
        "type": "Technical Discussion",
    }, headers={"Authorization": f"Bearer {alice_token}"})
    post_id = post_res.json()["id"]

    # Bob saves post
    save_res = await client.post(f"/api/feed/posts/{post_id}/save", headers={"Authorization": f"Bearer {bob_token}"})
    assert save_res.status_code == 200
    assert save_res.json()["isSaved"] is True

    # Bob checks saved posts
    bob_saved = await client.get("/api/feed/saved", headers={"Authorization": f"Bearer {bob_token}"})
    assert bob_saved.status_code == 200
    assert any(p["id"] == post_id for p in bob_saved.json())

    # Charlie checks saved posts (must be empty/not contain post)
    charlie_saved = await client.get("/api/feed/saved", headers={"Authorization": f"Bearer {charlie_token}"})
    assert charlie_saved.status_code == 200
    assert not any(p["id"] == post_id for p in charlie_saved.json())

    # Bob removes save
    unsave_res = await client.delete(f"/api/feed/posts/{post_id}/save", headers={"Authorization": f"Bearer {bob_token}"})
    assert unsave_res.status_code == 200
    assert unsave_res.json()["isSaved"] is False

    # Bob checks saved posts again
    bob_saved_after = await client.get("/api/feed/saved", headers={"Authorization": f"Bearer {bob_token}"})
    assert not any(p["id"] == post_id for p in bob_saved_after.json())
