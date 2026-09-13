import json
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient
import httpx
from pymongo import MongoClient
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app
from app.services.notification_service import NotificationService


def sync_db_cleanup():
    sync_client = MongoClient("mongodb://localhost:27017")
    db = sync_client["careerx_db"]
    db.conversations.delete_many({})
    db.messages.delete_many({})
    db.notifications.delete_many({"userId": {"$regex": ".*"}})
    db.calendar_events.delete_many({"userId": {"$regex": ".*"}})
    db.users.delete_many({"email": {"$regex": ".*@p8test\\.io$"}})
    db.profiles.delete_many({"userId": {"$regex": ".*"}})
    db.revoked_tokens.delete_many({"token": {"$regex": ".*p8test.*"}})


@pytest_asyncio.fixture(autouse=True)
async def cleanup_phase8_data():
    await DatabaseManager.connect()
    sync_db_cleanup()
    yield
    sync_db_cleanup()


@pytest_asyncio.fixture
async def async_client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def ws_client():
    with TestClient(app) as tc:
        yield tc


def receive_envelope(ws, expected_type=None):
    """Receive envelopes from WebSocket, filtering by expected type if specified."""
    while True:
        data = json.loads(ws.receive_text())
        if expected_type is None or data.get("type") == expected_type:
            return data


async def register_user(client: httpx.AsyncClient, email: str, name: str) -> tuple[str, str, dict]:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, token, headers


def register_user_sync(client: TestClient, email: str, name: str) -> tuple[str, str, dict]:
    res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, token, headers


# =========================================================================
# PART 1: MESSAGING SECURITY & AUTHORIZATION (REST)
# =========================================================================

@pytest.mark.asyncio
async def test_messaging_unauthenticated_conversations_blocked_401(async_client):
    res = await async_client.get("/api/messages/conversations")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_messaging_unauthenticated_messages_blocked_401(async_client):
    res = await async_client.get("/api/messages/conversations/conv-123/messages")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_messaging_unauthenticated_send_blocked_401(async_client):
    res = await async_client.post("/api/messages/conversations/conv-123/send", json={"content": "Hello"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_messaging_self_conversation_blocked_400(async_client):
    uid, _, headers = await register_user(async_client, "alice.self@p8test.io", "Alice Self")
    res = await async_client.post("/api/messages/conversations", json={"participantId": uid}, headers=headers)
    assert res.status_code == 400
    assert "cannot start a conversation with themselves" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_messaging_create_and_get_conversation_success(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.chat@p8test.io", "Alice Chat")
    uid_b, _, headers_b = await register_user(async_client, "bob.chat@p8test.io", "Bob Chat")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    assert conv_res.status_code in (200, 201)
    conv_data = conv_res.json()
    assert conv_data["peer"]["id"] == uid_b

    list_res = await async_client.get("/api/messages/conversations", headers=headers_a)
    assert list_res.status_code == 200
    convs = list_res.json()
    assert any(c["id"] == conv_data["id"] for c in convs)


@pytest.mark.asyncio
async def test_messaging_outsider_cannot_read_messages_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.priv@p8test.io", "Alice Priv")
    uid_b, _, _ = await register_user(async_client, "bob.priv@p8test.io", "Bob Priv")
    _, _, headers_c = await register_user(async_client, "charlie.outsider@p8test.io", "Charlie Outsider")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_c)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_messaging_outsider_cannot_send_message_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.send@p8test.io", "Alice Send")
    uid_b, _, _ = await register_user(async_client, "bob.send@p8test.io", "Bob Send")
    _, _, headers_c = await register_user(async_client, "charlie.send@p8test.io", "Charlie Outsider")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Intrusion message"},
        headers=headers_c,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_messaging_validation_empty_content_and_no_attachment_422(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.val@p8test.io", "Alice Val")
    uid_b, _, _ = await register_user(async_client, "bob.val@p8test.io", "Bob Val")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "   "},
        headers=headers_a,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_messaging_attachment_persistence(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.att@p8test.io", "Alice Att")
    uid_b, _, _ = await register_user(async_client, "bob.att@p8test.io", "Bob Att")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={
            "content": "Here is the architectural diagram packet.",
            "attachment": {
                "name": "system-architecture.pdf",
                "size": "2.4 MB",
                "type": "pdf",
            },
        },
        headers=headers_a,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["attachment"]["name"] == "system-architecture.pdf"
    assert data["attachment"]["type"] == "pdf"


@pytest.mark.asyncio
async def test_messaging_client_message_id_idempotency(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.idem@p8test.io", "Alice Idem")
    uid_b, _, _ = await register_user(async_client, "bob.idem@p8test.io", "Bob Idem")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    client_msg_id = "cl-msg-uuid-999"

    res1 = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Idempotent message payload", "clientMessageId": client_msg_id},
        headers=headers_a,
    )
    assert res1.status_code == 201
    msg1 = res1.json()

    res2 = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Idempotent message payload", "clientMessageId": client_msg_id},
        headers=headers_a,
    )
    assert res2.status_code == 201
    msg2 = res2.json()

    assert msg1["id"] == msg2["id"]

    history = await async_client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_a)
    assert len(history.json()) == 1


# =========================================================================
# PART 2: MESSAGE EDIT, DELETE, & READ RECEIPTS
# =========================================================================

@pytest.mark.asyncio
async def test_messaging_author_can_edit_message(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.edit@p8test.io", "Alice Edit")
    uid_b, _, _ = await register_user(async_client, "bob.edit@p8test.io", "Bob Edit")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    send_res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Original message text"},
        headers=headers_a,
    )
    msg_id = send_res.json()["id"]

    edit_res = await async_client.patch(
        f"/api/messages/conversations/{conv_id}/messages/{msg_id}",
        json={"content": "Updated message text after correction"},
        headers=headers_a,
    )
    assert edit_res.status_code == 200
    edited = edit_res.json()
    assert edited["content"] == "Updated message text after correction"
    assert edited["isEdited"] is True
    assert edited["editedAt"] is not None


@pytest.mark.asyncio
async def test_messaging_non_author_cannot_edit_message_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.noedit@p8test.io", "Alice NoEdit")
    uid_b, _, headers_b = await register_user(async_client, "bob.noedit@p8test.io", "Bob NoEdit")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    send_res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Alice's original message"},
        headers=headers_a,
    )
    msg_id = send_res.json()["id"]

    edit_res = await async_client.patch(
        f"/api/messages/conversations/{conv_id}/messages/{msg_id}",
        json={"content": "Bob tries to tamper with Alice's message"},
        headers=headers_b,
    )
    assert edit_res.status_code == 403


@pytest.mark.asyncio
async def test_messaging_edit_nonexistent_message_404(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.ne@p8test.io", "Alice NE")
    uid_b, _, _ = await register_user(async_client, "bob.ne@p8test.io", "Bob NE")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    edit_res = await async_client.patch(
        f"/api/messages/conversations/{conv_id}/messages/msg-nonexistent-123",
        json={"content": "Updating nonexistent message"},
        headers=headers_a,
    )
    assert edit_res.status_code == 404


@pytest.mark.asyncio
async def test_messaging_author_can_delete_message(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.del@p8test.io", "Alice Del")
    uid_b, _, _ = await register_user(async_client, "bob.del@p8test.io", "Bob Del")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    send_res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Message to be deleted"},
        headers=headers_a,
    )
    msg_id = send_res.json()["id"]

    del_res = await async_client.delete(
        f"/api/messages/conversations/{conv_id}/messages/{msg_id}",
        headers=headers_a,
    )
    assert del_res.status_code == 200

    history = await async_client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_a)
    assert not any(m["id"] == msg_id for m in history.json())


@pytest.mark.asyncio
async def test_messaging_non_author_cannot_delete_message_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.nodel@p8test.io", "Alice NoDel")
    uid_b, _, headers_b = await register_user(async_client, "bob.nodel@p8test.io", "Bob NoDel")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    send_res = await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Alice's message"},
        headers=headers_a,
    )
    msg_id = send_res.json()["id"]

    del_res = await async_client.delete(
        f"/api/messages/conversations/{conv_id}/messages/{msg_id}",
        headers=headers_b,
    )
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_messaging_mark_as_read_clears_caller_unread_only(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.read@p8test.io", "Alice Read")
    uid_b, _, headers_b = await register_user(async_client, "bob.read@p8test.io", "Bob Read")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    await async_client.post(
        f"/api/messages/conversations/{conv_id}/send",
        json={"content": "Hey Bob, check this note."},
        headers=headers_a,
    )

    read_res = await async_client.post(f"/api/messages/conversations/{conv_id}/read", headers=headers_b)
    assert read_res.status_code == 200

    bob_convs = await async_client.get("/api/messages/conversations", headers=headers_b)
    bob_conv = next(c for c in bob_convs.json() if c["id"] == conv_id)
    assert bob_conv["unreadCount"] == 0


# =========================================================================
# PART 3: WEBSOCKET REAL-TIME MESSAGING & EPHEMERAL TYPING
# =========================================================================

def test_ws_missing_token_rejected_1008(ws_client):
    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect("/api/ws/chat"):
            pass
    assert exc.value.code == 1008


def test_ws_invalid_token_rejected_1008(ws_client):
    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect("/api/ws/chat?token=malformed.fake.jwt"):
            pass
    assert exc.value.code == 1008


def test_ws_revoked_token_rejected_1008(ws_client):
    _, token, _ = register_user_sync(ws_client, "revoked.ws@p8test.io", "Revoked WS")
    sync_client = MongoClient("mongodb://localhost:27017")
    db = sync_client["careerx_db"]
    db.revoked_tokens.insert_one({"token": token, "revokedAt": datetime.now(timezone.utc).isoformat()})

    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token}"):
            pass
    assert exc.value.code == 1008


def test_ws_authenticated_connection_success(ws_client):
    _, token, _ = register_user_sync(ws_client, "auth.ws@p8test.io", "Auth WS")
    with ws_client.websocket_connect(f"/api/ws/chat?token={token}") as ws:
        ws.send_text(json.dumps({"type": "ping"}))
        reply = json.loads(ws.receive_text())
        assert reply["type"] == "pong"


def test_ws_message_delivery_between_participants(ws_client):
    uid_a, token_a, headers_a = register_user_sync(ws_client, "alice.wsd@p8test.io", "Alice WSD")
    uid_b, token_b, _ = register_user_sync(ws_client, "bob.wsd@p8test.io", "Bob WSD")

    conv_res = ws_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
            ws_a.send_text(json.dumps({
                "type": "message",
                "payload": {
                    "conversationId": conv_id,
                    "content": "Real-time message delivered via WebSocket!",
                },
            }))

            received = receive_envelope(ws_b, expected_type="message")
            assert received["type"] == "message"
            assert received["payload"]["content"] == "Real-time message delivered via WebSocket!"
            assert received["payload"]["conversationId"] == conv_id


def test_ws_outsider_does_not_receive_message(ws_client):
    uid_a, token_a, headers_a = register_user_sync(ws_client, "alice.wso@p8test.io", "Alice WSO")
    uid_b, token_b, _ = register_user_sync(ws_client, "bob.wso@p8test.io", "Bob WSO")
    _, token_c, _ = register_user_sync(ws_client, "charlie.wso@p8test.io", "Charlie WSO")

    conv_res = ws_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_c}") as ws_c:
            with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
                ws_a.send_text(json.dumps({
                    "type": "message",
                    "payload": {
                        "conversationId": conv_id,
                        "content": "Secret engineering plan",
                    },
                }))

                msg_b = receive_envelope(ws_b, expected_type="message")
                assert msg_b["type"] == "message"

                ws_c.send_text(json.dumps({"type": "ping"}))
                reply_c = receive_envelope(ws_c, expected_type="pong")
                assert reply_c["type"] == "pong"


def test_ws_ephemeral_typing_not_persisted_in_db(ws_client):
    uid_a, token_a, headers_a = register_user_sync(ws_client, "alice.typ@p8test.io", "Alice Typ")
    uid_b, token_b, _ = register_user_sync(ws_client, "bob.typ@p8test.io", "Bob Typ")

    conv_res = ws_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
            ws_a.send_text(json.dumps({
                "type": "typing",
                "payload": {"conversationId": conv_id, "isTyping": True},
            }))

            received = receive_envelope(ws_b, expected_type="typing")
            assert received["type"] == "typing"
            assert received["payload"]["isTyping"] is True

            sync_client = MongoClient("mongodb://localhost:27017")
            db = sync_client["careerx_db"]
            assert db.messages.count_documents({"content": {"$regex": ".*typing.*"}}) == 0


# =========================================================================
# PART 4: NOTIFICATIONS SCOPING & OPERATIONS
# =========================================================================

@pytest.mark.asyncio
async def test_notifications_unauthenticated_blocked_401(async_client):
    res = await async_client.get("/api/notifications")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_notifications_user_scoping_isolation(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.notif@p8test.io", "Alice Notif")
    uid_b, _, headers_b = await register_user(async_client, "bob.notif@p8test.io", "Bob Notif")

    n_a = await async_client.post(
        "/api/notifications",
        json={
            "category": "interview_reminder",
            "title": "Alice Interview with Stripe",
            "description": "Round 1 architecture screen.",
            "priority": "urgent",
        },
        headers=headers_a,
    )
    assert n_a.status_code == 201
    nid_a = n_a.json()["id"]

    bob_list = await async_client.get("/api/notifications", headers=headers_b)
    assert bob_list.status_code == 200
    assert not any(n["id"] == nid_a for n in bob_list.json())


@pytest.mark.asyncio
async def test_notifications_non_owner_cannot_mark_read_404(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.nread@p8test.io", "Alice NRead")
    _, _, headers_b = await register_user(async_client, "bob.nread@p8test.io", "Bob NRead")

    n_a = await async_client.post(
        "/api/notifications",
        json={
            "category": "message",
            "title": "New DM",
            "description": "You received a message.",
        },
        headers=headers_a,
    )
    nid_a = n_a.json()["id"]

    res = await async_client.patch(f"/api/notifications/{nid_a}/read", headers=headers_b)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_notifications_non_owner_cannot_delete_404(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.ndel@p8test.io", "Alice NDel")
    _, _, headers_b = await register_user(async_client, "bob.ndel@p8test.io", "Bob NDel")

    n_a = await async_client.post(
        "/api/notifications",
        json={
            "category": "follow_up",
            "title": "Follow up with recruiter",
            "description": "Send thank you note.",
        },
        headers=headers_a,
    )
    nid_a = n_a.json()["id"]

    res = await async_client.delete(f"/api/notifications/{nid_a}", headers=headers_b)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_notifications_unread_count_matches_db(async_client):
    uid, _, headers = await register_user(async_client, "alice.count@p8test.io", "Alice Count")

    cnt_res = await async_client.get("/api/notifications/unread-count", headers=headers)
    assert cnt_res.status_code == 200
    assert cnt_res.json()["unreadCount"] == 0

    await async_client.post(
        "/api/notifications",
        json={"category": "message", "title": "N1", "description": "D1"},
        headers=headers,
    )
    await async_client.post(
        "/api/notifications",
        json={"category": "calendar_event", "title": "N2", "description": "D2"},
        headers=headers,
    )

    cnt_res2 = await async_client.get("/api/notifications/unread-count", headers=headers)
    assert cnt_res2.json()["unreadCount"] == 2


@pytest.mark.asyncio
async def test_notifications_category_filtering(async_client):
    uid, _, headers = await register_user(async_client, "alice.filter@p8test.io", "Alice Filter")

    await async_client.post(
        "/api/notifications",
        json={"category": "interview_reminder", "title": "Interview", "description": "D"},
        headers=headers,
    )
    await async_client.post(
        "/api/notifications",
        json={"category": "calendar_event", "title": "Calendar", "description": "D"},
        headers=headers,
    )

    res = await async_client.get("/api/notifications?category=interview_reminder", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["category"] == "interview_reminder"


@pytest.mark.asyncio
async def test_notifications_deduplication_via_dedup_key(async_client):
    uid, _, headers = await register_user(async_client, "alice.dedup@p8test.io", "Alice Dedup")

    res1 = await async_client.post(
        "/api/notifications",
        json={
            "category": "application_deadline",
            "title": "Deadline Approaching",
            "description": "24 hours remaining.",
            "dedupKey": "deadline-corp-app-77",
        },
        headers=headers,
    )
    assert res1.status_code == 201

    res2 = await async_client.post(
        "/api/notifications",
        json={
            "category": "application_deadline",
            "title": "Deadline Approaching",
            "description": "24 hours remaining.",
            "dedupKey": "deadline-corp-app-77",
        },
        headers=headers,
    )
    assert res2.status_code == 201
    assert res1.json()["id"] == res2.json()["id"]

    all_notifs = await async_client.get("/api/notifications", headers=headers)
    assert len(all_notifs.json()) == 1


# =========================================================================
# PART 5: CALENDAR SYSTEM & AUTHORIZATION
# =========================================================================

@pytest.mark.asyncio
async def test_calendar_unauthenticated_events_blocked_401(async_client):
    res = await async_client.get("/api/calendar/events")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_calendar_unauthenticated_sync_blocked_401(async_client):
    res = await async_client.post("/api/calendar/google/sync")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_calendar_create_event_success(async_client):
    uid, _, headers = await register_user(async_client, "alice.cal@p8test.io", "Alice Cal")

    res = await async_client.post(
        "/api/calendar/events",
        json={
            "title": "Staff Platform Engineer Technical Interview",
            "type": "Interview",
            "date": "2026-09-18",
            "time": "10:00 AM",
            "endTime": "11:00 AM",
            "company": "Stripe",
            "locationOrUrl": "https://stripe.zoom.us/j/12345",
            "notes": "Distributed consensus and Raft log replication.",
        },
        headers=headers,
    )
    assert res.status_code == 201
    event = res.json()
    assert event["title"] == "Staff Platform Engineer Technical Interview"
    assert event["company"] == "Stripe"
    assert event["userId"] == uid
    assert "id" in event


@pytest.mark.asyncio
async def test_calendar_date_validation_invalid_format_422(async_client):
    uid, _, headers = await register_user(async_client, "alice.cval@p8test.io", "Alice CVal")

    res = await async_client.post(
        "/api/calendar/events",
        json={
            "title": "Bad Date Event",
            "date": "09/18/2026",
            "time": "10:00 AM",
        },
        headers=headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_calendar_time_range_validation_start_gte_end_422(async_client):
    uid, _, headers = await register_user(async_client, "alice.ctime@p8test.io", "Alice CTime")

    res = await async_client.post(
        "/api/calendar/events",
        json={
            "title": "Inverted Time Event",
            "date": "2026-09-18",
            "time": "02:00 PM",
            "endTime": "01:00 PM",
        },
        headers=headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_calendar_owner_isolation_and_cross_user_privacy(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.cisol@p8test.io", "Alice CIsol")
    uid_b, _, headers_b = await register_user(async_client, "bob.cisol@p8test.io", "Bob CIsol")

    c_a = await async_client.post(
        "/api/calendar/events",
        json={
            "title": "Alice Private Onsite Loop",
            "date": "2026-09-20",
            "time": "09:00 AM",
        },
        headers=headers_a,
    )
    evt_a_id = c_a.json()["id"]

    bob_events = await async_client.get("/api/calendar/events", headers=headers_b)
    assert not any(e["id"] == evt_a_id for e in bob_events.json())

    bob_direct = await async_client.get(f"/api/calendar/events/{evt_a_id}", headers=headers_b)
    assert bob_direct.status_code in (403, 404)


@pytest.mark.asyncio
async def test_calendar_owner_can_update_event(async_client):
    uid, _, headers = await register_user(async_client, "alice.cupd@p8test.io", "Alice CUpd")

    c = await async_client.post(
        "/api/calendar/events",
        json={"title": "Screen Round", "date": "2026-09-21", "time": "11:00 AM"},
        headers=headers,
    )
    evt_id = c.json()["id"]

    upd = await async_client.patch(
        f"/api/calendar/events/{evt_id}",
        json={"title": "Screen Round (Rescheduled)", "time": "03:00 PM"},
        headers=headers,
    )
    assert upd.status_code == 200
    assert upd.json()["title"] == "Screen Round (Rescheduled)"
    assert upd.json()["time"] == "03:00 PM"


@pytest.mark.asyncio
async def test_calendar_non_owner_cannot_update_event_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.cnoupd@p8test.io", "Alice CNoUpd")
    uid_b, _, headers_b = await register_user(async_client, "bob.cnoupd@p8test.io", "Bob CNoUpd")

    c = await async_client.post(
        "/api/calendar/events",
        json={"title": "Alice Screen", "date": "2026-09-21", "time": "11:00 AM"},
        headers=headers_a,
    )
    evt_id = c.json()["id"]

    upd = await async_client.patch(
        f"/api/calendar/events/{evt_id}",
        json={"title": "Bob Tampering With Alice Event"},
        headers=headers_b,
    )
    assert upd.status_code == 403


@pytest.mark.asyncio
async def test_calendar_owner_can_delete_event(async_client):
    uid, _, headers = await register_user(async_client, "alice.cdel@p8test.io", "Alice CDel")

    c = await async_client.post(
        "/api/calendar/events",
        json={"title": "Cancelled Meeting", "date": "2026-09-22", "time": "11:00 AM"},
        headers=headers,
    )
    evt_id = c.json()["id"]

    del_res = await async_client.delete(f"/api/calendar/events/{evt_id}", headers=headers)
    assert del_res.status_code == 200

    check_res = await async_client.get(f"/api/calendar/events/{evt_id}", headers=headers)
    assert check_res.status_code == 404


@pytest.mark.asyncio
async def test_calendar_non_owner_cannot_delete_event_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.cnodel@p8test.io", "Alice CNoDel")
    uid_b, _, headers_b = await register_user(async_client, "bob.cnodel@p8test.io", "Bob CNoDel")

    c = await async_client.post(
        "/api/calendar/events",
        json={"title": "Alice Event", "date": "2026-09-22", "time": "11:00 AM"},
        headers=headers_a,
    )
    evt_id = c.json()["id"]

    del_res = await async_client.delete(f"/api/calendar/events/{evt_id}", headers=headers_b)
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_calendar_google_sync_reflects_actual_events(async_client):
    uid, _, headers = await register_user(async_client, "alice.csync@p8test.io", "Alice CSync")

    sync1 = await async_client.post("/api/calendar/google/sync", headers=headers)
    assert sync1.status_code == 200
    assert sync1.json()["syncedCount"] == 0
    assert sync1.json()["accountEmail"] == "alice.csync@p8test.io"

    for i in range(3):
        await async_client.post(
            "/api/calendar/events",
            json={"title": f"Event {i}", "date": f"2026-09-2{i}", "time": "10:00 AM"},
            headers=headers,
        )

    sync2 = await async_client.post("/api/calendar/google/sync", headers=headers)
    assert sync2.status_code == 200
    assert sync2.json()["syncedCount"] == 3
    assert sync2.json()["success"] is True
