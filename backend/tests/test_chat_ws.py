import json
from bson import ObjectId
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient
from pymongo import MongoClient
import pytest

from app.main import app


def clean_db():
    sync_client = MongoClient("mongodb://localhost:27017")
    db = sync_client["careerx_db"]
    db.conversations.delete_many({})
    db.messages.delete_many({})
    db.notifications.delete_many({})
    db.users.delete_many({"email": {"$regex": ".*@wstest\\.io$"}})
    db.profiles.delete_many({"userId": {"$regex": ".*"}})


@pytest.fixture(autouse=True)
def run_clean_db():
    clean_db()
    yield
    clean_db()


@pytest.fixture
def ws_client():
    with TestClient(app) as tc:
        yield tc


def register_user(client: TestClient, email: str, name: str):
    res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    assert res.status_code == 201
    return res.json()["user"]["id"], res.json()["access_token"]


def receive_envelope(ws, expected_type=None):
    """Receive envelopes from WebSocket, filtering by expected type if specified."""
    while True:
        data = json.loads(ws.receive_text())
        if expected_type is None or data.get("type") == expected_type:
            return data


def test_websocket_auth_rejection(ws_client: TestClient):
    # 1. Missing token -> rejected with WS 1008
    with pytest.raises(WebSocketDisconnect) as exc_missing:
        with ws_client.websocket_connect("/api/ws/chat"):
            pass
    assert exc_missing.value.code == 1008

    # 2. Invalid token -> rejected with WS 1008
    with pytest.raises(WebSocketDisconnect) as exc_invalid:
        with ws_client.websocket_connect("/api/ws/chat?token=invalid.token.here"):
            pass
    assert exc_invalid.value.code == 1008

    # 3. Hard-coded development tokens must remain rejected.
    with pytest.raises(WebSocketDisconnect) as exc_mock:
        with ws_client.websocket_connect("/api/ws/chat?token=mock-test-token"):
            pass
    assert exc_mock.value.code == 1008


def test_websocket_message_exchange_and_pipeline(ws_client: TestClient):
    # Register Alice and Bob
    uid_a, token_a = register_user(ws_client, "alice.ws@wstest.io", "Alice WS")
    uid_b, token_b = register_user(ws_client, "bob.ws@wstest.io", "Bob WS")

    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Start conversation via REST
    conv_res = ws_client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # Both Alice and Bob connect via WebSocket
    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
            # Alice sends message envelope
            ws_a.send_text(json.dumps({
                "type": "message",
                "payload": {
                    "conversationId": conv_id,
                    "content": "Real-time greeting from Alice!",
                },
            }))

            # Alice receives confirmation (isOutgoing == True)
            data_a = receive_envelope(ws_a, expected_type="message")
            assert data_a["type"] == "message"
            assert data_a["payload"]["content"] == "Real-time greeting from Alice!"
            assert data_a["payload"]["isOutgoing"] is True
            assert data_a["payload"]["senderId"] == uid_a

            # Bob receives message (isOutgoing == False)
            data_b = receive_envelope(ws_b, expected_type="message")
            assert data_b["type"] == "message"
            assert data_b["payload"]["content"] == "Real-time greeting from Alice!"
            assert data_b["payload"]["isOutgoing"] is False
            assert data_b["payload"]["senderId"] == uid_a

    # Verify MongoDB persistence using sync client
    sync_client = MongoClient("mongodb://localhost:27017")
    db = sync_client["careerx_db"]
    saved_msg = db.messages.find_one({"conversationId": conv_id})
    assert saved_msg is not None
    assert saved_msg["content"] == "Real-time greeting from Alice!"

    # Verify conversation updated
    saved_conv = db.conversations.find_one({"$or": [{"id": conv_id}, {"_id": ObjectId(conv_id)}]})
    assert saved_conv is not None
    assert saved_conv["lastMessage"] == "Real-time greeting from Alice!"
    assert saved_conv["unreadCounts"][uid_b] == 1


def test_websocket_typing_and_read_events(ws_client: TestClient):
    uid_a, token_a = register_user(ws_client, "alice.type@wstest.io", "Alice Type")
    uid_b, token_b = register_user(ws_client, "bob.type@wstest.io", "Bob Type")

    headers_a = {"Authorization": f"Bearer {token_a}"}

    conv_res = ws_client.post(
        "/api/messages/conversations",
        json={"peerId": uid_b},
        headers=headers_a,
    )
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
            # 1. Typing event from Alice
            ws_a.send_text(json.dumps({
                "type": "typing",
                "payload": {
                    "conversationId": conv_id,
                    "isTyping": True,
                },
            }))

            # Bob receives typing event
            typing_event = receive_envelope(ws_b, expected_type="typing")
            assert typing_event["type"] == "typing"
            assert typing_event["payload"]["conversationId"] == conv_id
            assert typing_event["payload"]["senderId"] == uid_a
            assert typing_event["payload"]["isTyping"] is True

            # 2. Read event from Bob
            ws_b.send_text(json.dumps({
                "type": "read",
                "payload": {
                    "conversationId": conv_id,
                },
            }))

            # Alice receives read receipt
            read_event = receive_envelope(ws_a, expected_type="read")
            assert read_event["type"] == "read"
            assert read_event["payload"]["conversationId"] == conv_id
            assert read_event["payload"]["readerId"] == uid_b


def test_websocket_resilience(ws_client: TestClient):
    uid_a, token_a = register_user(ws_client, "alice.res@wstest.io", "Alice Res")

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
        # 1. Send malformed JSON -> receives error envelope, connection remains alive
        ws_a.send_text("this is not valid json {{{")
        err1 = receive_envelope(ws_a, expected_type="error")
        assert err1["type"] == "error"
        assert "malformed json" in err1["payload"]["message"].lower()

        # 2. Send unsupported event type
        ws_a.send_text(json.dumps({"type": "dance", "payload": {}}))
        err2 = receive_envelope(ws_a, expected_type="error")
        assert err2["type"] == "error"
        assert "unsupported event type" in err2["payload"]["message"].lower()

        # 3. Send message to unauthorized/non-existent conversation
        ws_a.send_text(json.dumps({
            "type": "message",
            "payload": {
                "conversationId": "fake_conv_999",
                "content": "Hello",
            },
        }))
        err3 = receive_envelope(ws_a, expected_type="error")
        assert err3["type"] == "error"
        assert "not found" in err3["payload"]["message"].lower()

        # 4. Ping returns pong
        ws_a.send_text(json.dumps({"type": "ping", "payload": {}}))
        pong = receive_envelope(ws_a, expected_type="pong")
        assert pong["type"] == "pong"
