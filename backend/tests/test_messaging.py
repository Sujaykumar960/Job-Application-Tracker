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
        await db.conversations.delete_many({})
        await db.messages.delete_many({})
        await db.notifications.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@msgtest\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str) -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    return user_id, token


@pytest.mark.asyncio
async def test_conversation_creation_and_self_chat_guard(client):
    uid_a, token_a = await register_user(client, "alice.chat@msgtest.io", "Alice Chat")
    uid_b, token_b = await register_user(client, "bob.chat@msgtest.io", "Bob Chat")

    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Attempt self-conversation -> 400 Bad Request
    self_conv = await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_a},
        headers=headers_a,
    )
    assert self_conv.status_code == 400
    assert "cannot start a conversation with themselves" in self_conv.json()["detail"].lower()

    # 2. Start conversation with Bob -> 201 Created
    create_conv = await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    assert create_conv.status_code == 201
    conv = create_conv.json()
    conv_id = conv["id"]
    assert conv["peer"]["id"] == uid_b

    # 3. Call create conversation again -> returns existing conversation
    create_again = await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    assert create_again.status_code == 201
    assert create_again.json()["id"] == conv_id


@pytest.mark.asyncio
async def test_participant_privacy_isolation(client):
    uid_a, token_a = await register_user(client, "alice.priv@msgtest.io", "Alice Priv")
    uid_b, token_b = await register_user(client, "bob.priv@msgtest.io", "Bob Priv")
    uid_c, token_c = await register_user(client, "charlie.priv@msgtest.io", "Charlie Priv")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Alice creates conversation with Bob
    conv_res = await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    conv_id = conv_res.json()["id"]

    # Charlie (outsider) attempts to read conversation details (403 Forbidden)
    read_c = await client.get(f"/api/messages/conversations/{conv_id}", headers=headers_c)
    assert read_c.status_code == 403

    # Charlie attempts to read messages thread (403 Forbidden)
    thread_c = await client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_c)
    assert thread_c.status_code == 403

    # Charlie attempts to send message into Alice & Bob's conversation (403 Forbidden)
    send_c = await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json={"content": "Eavesdropping message"},
        headers=headers_c,
    )
    assert send_c.status_code == 403


@pytest.mark.asyncio
async def test_message_creation_pipeline_and_attachment(client):
    uid_a, token_a = await register_user(client, "alice.pipe@msgtest.io", "Alice Pipe")
    uid_b, token_b = await register_user(client, "bob.pipe@msgtest.io", "Bob Pipe")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Start conversation
    conv_res = await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    conv_id = conv_res.json()["id"]

    # Alice sends message with PDF attachment
    msg_payload = {
        "content": "Here is the distributed systems briefing packet.",
        "attachment": {
            "id": "att-pdf-1",
            "name": "Distributed_Systems_Onsite.pdf",
            "size": "2.4 MB",
            "type": "pdf",
            "url": "https://storage.careerx.internal/briefing.pdf",
        },
    }

    send_res = await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json=msg_payload,
        headers=headers_a,
    )
    assert send_res.status_code == 201
    msg_data = send_res.json()
    msg_id = msg_data["id"]

    # Step 1: Verify message persisted with attachment
    assert msg_data["content"] == msg_payload["content"]
    assert msg_data["attachment"]["name"] == "Distributed_Systems_Onsite.pdf"
    assert msg_data["attachment"]["type"] == "pdf"
    assert msg_data["isOutgoing"] is True

    # Step 2 & 3: Check conversation lastMessage and lastMessageTime
    conv_view_a = (await client.get(f"/api/messages/conversations/{conv_id}", headers=headers_a)).json()
    assert conv_view_a["lastMessage"] == msg_payload["content"]
    assert conv_view_a["lastMessageTime"] is not None

    # Step 4: Check unread count: Bob has 1 unread message, Alice has 0
    conv_view_b = (await client.get(f"/api/messages/conversations/{conv_id}", headers=headers_b)).json()
    assert conv_view_b["unreadCount"] == 1
    assert conv_view_a["unreadCount"] == 0

    # Step 5: Verify Bob received notification for the new message
    b_notifs = (await client.get("/api/notifications?category=message", headers=headers_b)).json()
    assert len(b_notifs) >= 1
    assert "Alice Pipe" in b_notifs[0]["title"]


@pytest.mark.asyncio
async def test_dynamic_is_outgoing_derivation(client):
    uid_a, token_a = await register_user(client, "alice.out@msgtest.io", "Alice Out")
    uid_b, token_b = await register_user(client, "bob.out@msgtest.io", "Bob Out")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Start conversation
    conv_id = (await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )).json()["id"]

    # Alice sends message
    await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json={"content": "Ping from Alice"},
        headers=headers_a,
    )

    # Bob sends message
    await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json={"content": "Pong from Bob"},
        headers=headers_b,
    )

    # Alice views thread
    msgs_a = (await client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_a)).json()
    assert len(msgs_a) == 2
    assert msgs_a[0]["content"] == "Ping from Alice"
    assert msgs_a[0]["isOutgoing"] is True  # Alice's message is outgoing for Alice
    assert msgs_a[1]["content"] == "Pong from Bob"
    assert msgs_a[1]["isOutgoing"] is False  # Bob's message is incoming for Alice

    # Bob views thread
    msgs_b = (await client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_b)).json()
    assert msgs_b[0]["content"] == "Ping from Alice"
    assert msgs_b[0]["isOutgoing"] is False  # Alice's message is incoming for Bob
    assert msgs_b[1]["content"] == "Pong from Bob"
    assert msgs_b[1]["isOutgoing"] is True  # Bob's message is outgoing for Bob


@pytest.mark.asyncio
async def test_read_status_and_unread_count_operations(client):
    uid_a, token_a = await register_user(client, "alice.read@msgtest.io", "Alice Read")
    uid_b, token_b = await register_user(client, "bob.read@msgtest.io", "Bob Read")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Start conversation
    conv_id = (await client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )).json()["id"]

    # Alice sends two messages
    msg1 = (await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json={"content": "Message 1"},
        headers=headers_a,
    )).json()

    await client.post(
        f"/api/messages/conversations/{conv_id}/messages",
        json={"content": "Message 2"},
        headers=headers_a,
    )

    # Bob sees unreadCount == 2
    conv_b = (await client.get(f"/api/messages/conversations/{conv_id}", headers=headers_b)).json()
    assert conv_b["unreadCount"] == 2

    # Bob marks message 1 as read
    read_patch = await client.patch(f"/api/messages/{msg1['id']}/read", headers=headers_b)
    assert read_patch.status_code == 200
    assert read_patch.json()["status"] == "read"

    # Bob marks entire conversation as read
    read_conv = await client.post(f"/api/messages/conversations/{conv_id}/read", headers=headers_b)
    assert read_conv.status_code == 200
    assert read_conv.json()["success"] is True

    # Bob's unreadCount is now 0
    conv_b_after = (await client.get(f"/api/messages/conversations/{conv_id}", headers=headers_b)).json()
    assert conv_b_after["unreadCount"] == 0
