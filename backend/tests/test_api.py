import pytest
from starlette.testclient import TestClient

from app.main import app


def test_validation_error_format(client: TestClient):
    """Verify validation errors follow the ApiErrorResponse schema."""
    # Send bad login payload (empty password, invalid email)
    response = client.post("/api/auth/login", json={"email": "not-an-email", "password": ""})
    assert response.status_code == 422
    data = response.json()
    assert "statusCode" in data
    assert data["statusCode"] == 422
    assert "message" in data
    assert "detail" in data
    assert "timestamp" in data


def test_auth_and_application_lifecycle(client: TestClient):
    """Test register -> login -> create application -> get applications flow."""
    unique_email = f"candidate_{TestClient.__name__}@careerx.io".lower()
    reg_payload = {
        "name": "Jordan Lee",
        "email": unique_email,
        "password": "Password12345!",
        "role": "seeker",
    }

    # 1. Register
    reg_res = client.post("/api/auth/register", json=reg_payload)
    # If already registered in previous test run, status might be 400
    if reg_res.status_code == 201:
        reg_data = reg_res.json()
        assert "token" in reg_data
        token = reg_data["token"]
        assert reg_data["user"]["name"] == "Jordan Lee"
    else:
        # Login
        login_res = client.post("/api/auth/login", json={
            "email": unique_email,
            "password": "Password12345!",
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. Check /api/auth/me
    me_res = client.get("/api/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 3. Create an application
    app_payload = {
        "company": "Stripe",
        "role": "Backend Infrastructure Engineer",
        "location": "San Francisco, CA",
        "status": "Applied",
        "priority": "High",
        "matchScore": 92,
        "salaryRange": "$180k - $220k",
        "tags": ["Go", "Kafka", "Distributed Systems"],
    }
    app_res = client.post("/api/applications", json=app_payload, headers=auth_headers)
    assert app_res.status_code == 201
    created_app = app_res.json()
    assert created_app["company"] == "Stripe"
    assert created_app["id"] is not None
    app_id = created_app["id"]

    # 4. Fetch applications
    list_res = client.get("/api/applications", headers=auth_headers)
    assert list_res.status_code == 200
    apps = list_res.json()
    assert any(a["id"] == app_id for a in apps)

    # 5. Update application
    update_res = client.patch(f"/api/applications/{app_id}", json={"status": "Interview"}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Interview"

    # 6. Delete application
    del_res = client.delete(f"/api/applications/{app_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_websocket_chat_echo(client: TestClient):
    """Verify WebSocket handshake and envelope messaging."""
    reg_res = client.post("/api/auth/register", json={
        "name": "WebSocket Tester",
        "email": "websocket_tester@careerx.io",
        "password": "Password12345!",
        "role": "seeker",
    })
    assert reg_res.status_code in (201, 400)
    if reg_res.status_code == 201:
        token = reg_res.json()["token"]  # Fix: auth router returns 'token', not 'access_token'
    else:
        login_res = client.post("/api/auth/login", json={
            "email": "websocket_tester@careerx.io",
            "password": "Password12345!",
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]  # Fix: auth router returns 'token', not 'access_token'

    with client.websocket_connect(f"/api/ws/chat?token={token}") as ws:
        # Send ping envelope
        ws.send_json({"type": "ping", "payload": {}})
        # Expect pong or presence envelope
        resp = ws.receive_json()
        assert resp["type"] in ["pong", "presence", "message"]
