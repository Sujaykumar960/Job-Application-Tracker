import pytest
import pytest_asyncio
import httpx

from app.database import DatabaseManager
from app.main import app
from app.seed import DEFAULT_DEV_PASSWORD, seed_database


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Teardown: clean up seeded data so subsequent test suites start with clean state
    db = DatabaseManager.db
    if db is not None:
        collections = [
            "users", "profiles", "jobs", "applications", "conversations",
            "messages", "connections", "connection_requests", "posts",
            "notifications", "candidates", "recruiter_interactions", "progress"
        ]
        for c in collections:
            await db[c].delete_many({})


@pytest.mark.asyncio
async def test_seed_idempotency_and_counts(client):
    db = DatabaseManager.db
    assert db is not None

    # 1. First seed with reset
    counts_1 = await seed_database(reset=True)
    assert counts_1["users"] == 9
    assert counts_1["jobs"] == 15
    assert counts_1["applications"] == 10
    assert counts_1["conversations"] == 2
    assert counts_1["messages"] == 5
    assert counts_1["connections"] == 2
    assert counts_1["connection_requests"] == 3
    assert counts_1["posts"] == 2
    assert counts_1["notifications"] == 7
    assert counts_1["candidates"] == 6

    # 2. Second seed (idempotency check)
    counts_2 = await seed_database(reset=False)
    assert counts_2 == counts_1

    # Verify directly from MongoDB that no duplicate documents were created
    assert await db.users.count_documents({}) == 9
    assert await db.jobs.count_documents({}) == 15
    assert await db.applications.count_documents({}) == 10
    assert await db.conversations.count_documents({}) == 2
    assert await db.messages.count_documents({}) == 5
    assert await db.connections.count_documents({}) == 2
    assert await db.connection_requests.count_documents({}) == 3
    assert await db.posts.count_documents({}) == 2
    assert await db.notifications.count_documents({}) == 7
    assert await db.candidates.count_documents({}) == 6


@pytest.mark.asyncio
async def test_seed_relational_integrity(client):
    db = DatabaseManager.db
    assert db is not None
    await seed_database(reset=False)

    all_users = await db.users.find({}).to_list(100)
    user_ids = {u["id"] for u in all_users}

    # 1. Applications belong to an existing user
    applications = await db.applications.find({}).to_list(100)
    for app_doc in applications:
        assert app_doc["userId"] in user_ids, f"Application {app_doc['id']} has invalid userId"

    # 2. Conversations: participants must correspond to existing users
    conversations = await db.conversations.find({}).to_list(100)
    for conv in conversations:
        for p in conv["participants"]:
            assert p in user_ids, f"Conversation {conv['id']} participant {p} not found in users"

    # 3. Messages: sender must be an existing user and participant of the conversation
    conv_map = {c["id"]: c["participants"] for c in conversations}
    messages = await db.messages.find({}).to_list(100)
    for msg in messages:
        sender = msg["senderId"]
        cid = msg["conversationId"]
        assert sender in user_ids, f"Message {msg['id']} sender {sender} not found in users"
        assert cid in conv_map, f"Message {msg['id']} has orphan conversationId {cid}"
        assert sender in conv_map[cid], f"Message sender {sender} is not a participant of {cid}"

    # 4. Connections: both requester and receiver must exist in users
    connections = await db.connections.find({}).to_list(100)
    for conn in connections:
        assert conn["requesterId"] in user_ids
        assert conn["receiverId"] in user_ids

    # 5. Connection Requests: sender and recipient must exist in users
    requests = await db.connection_requests.find({}).to_list(100)
    for req in requests:
        assert req["senderId"] in user_ids
        assert req["recipientId"] in user_ids

    # 6. Notifications: recipient must exist in users
    notifs = await db.notifications.find({}).to_list(100)
    for n in notifs:
        assert n["userId"] in user_ids


@pytest.mark.asyncio
async def test_seed_authentication_and_roles(client):
    await seed_database(reset=False)

    # 1. Seeker Login: Alex Rivera
    alex_res = await client.post("/api/auth/login", json={
        "email": "alex.rivera@devmail.io",
        "password": DEFAULT_DEV_PASSWORD,
    })
    assert alex_res.status_code == 200
    alex_data = alex_res.json()
    assert alex_data["user"]["role"] == "seeker"
    assert "access_token" in alex_data

    # 2. Recruiter Login: Sarah Lin (Stripe)
    sarah_res = await client.post("/api/auth/login", json={
        "email": "sarah.lin@stripe.com",
        "password": DEFAULT_DEV_PASSWORD,
    })
    assert sarah_res.status_code == 200
    sarah_data = sarah_res.json()
    assert sarah_data["user"]["role"] == "recruiter"
    assert sarah_data["user"]["company"] == "Stripe"

    # 3. Recruiter Login: CloudScale Recruiter
    cs_res = await client.post("/api/auth/login", json={
        "email": "recruiter@cloudscale.com",
        "password": DEFAULT_DEV_PASSWORD,
    })
    assert cs_res.status_code == 200
    cs_data = cs_res.json()
    assert cs_data["user"]["role"] == "recruiter"
    assert cs_data["user"]["company"] == "CloudScale"

    # 4. Admin Login: CareerX Admin
    admin_res = await client.post("/api/auth/login", json={
        "email": "admin@careerx.io",
        "password": DEFAULT_DEV_PASSWORD,
    })
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["user"]["role"] == "admin"
