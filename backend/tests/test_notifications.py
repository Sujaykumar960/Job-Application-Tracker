import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app
from app.services.notification_service import NotificationService


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.notifications.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@notiftest\\.io$"}})
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
async def test_notification_category_validation(client):
    _, token = await register_user(client, "val@notiftest.io", "Validator User")
    headers = {"Authorization": f"Bearer {token}"}

    # Valid category
    valid_res = await client.post("/api/notifications", json={
        "category": "interview_reminder",
        "title": "Upcoming Interview with Stripe",
        "description": "System architecture onsite round in 2 hours.",
        "priority": "urgent",
        "company": "Stripe",
    }, headers=headers)
    assert valid_res.status_code == 201
    assert valid_res.json()["category"] == "interview_reminder"

    # Invalid category
    invalid_res = await client.post("/api/notifications", json={
        "category": "invalid_unknown_category",
        "title": "Bad Notification",
        "description": "This should fail validation.",
    }, headers=headers)
    assert invalid_res.status_code == 422


@pytest.mark.asyncio
async def test_notification_crud_and_user_isolation(client):
    uid_a, token_a = await register_user(client, "alice@notiftest.io", "Alice")
    uid_b, token_b = await register_user(client, "bob@notiftest.io", "Bob")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates a notification
    create_res = await client.post("/api/notifications", json={
        "category": "application_deadline",
        "title": "Linear Role Closing",
        "description": "Product engineering role closes in 24 hours.",
        "priority": "urgent",
        "company": "Linear",
    }, headers=headers_a)
    assert create_res.status_code == 201
    notif = create_res.json()
    notif_id = notif["id"]
    assert notif["isRead"] is False

    # Alice can read her notification
    get_a = await client.get(f"/api/notifications/{notif_id}", headers=headers_a)
    assert get_a.status_code == 200
    assert get_a.json()["id"] == notif_id

    # Bob CANNOT read Alice's notification (404 Not Found - strict isolation)
    get_b = await client.get(f"/api/notifications/{notif_id}", headers=headers_b)
    assert get_b.status_code == 404

    # Bob CANNOT mark Alice's notification as read (404 Not Found)
    patch_b = await client.patch(f"/api/notifications/{notif_id}/read", headers=headers_b)
    assert patch_b.status_code == 404

    # Bob CANNOT delete Alice's notification (404 Not Found)
    del_b = await client.delete(f"/api/notifications/{notif_id}", headers=headers_b)
    assert del_b.status_code == 404

    # Alice marks her notification as read
    patch_a = await client.patch(f"/api/notifications/{notif_id}/read", headers=headers_a)
    assert patch_a.status_code == 200
    assert patch_a.json()["success"] is True

    # Verify isRead is True
    check_read = await client.get(f"/api/notifications/{notif_id}", headers=headers_a)
    assert check_read.json()["isRead"] is True

    # Alice deletes her notification
    del_a = await client.delete(f"/api/notifications/{notif_id}", headers=headers_a)
    assert del_a.status_code == 200
    assert del_a.json()["success"] is True

    # Subsequent GET returns 404
    verify_del = await client.get(f"/api/notifications/{notif_id}", headers=headers_a)
    assert verify_del.status_code == 404


@pytest.mark.asyncio
async def test_notification_filtering_and_unread_count(client):
    uid, token = await register_user(client, "filter@notiftest.io", "Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Unread urgent interview reminder
    await client.post("/api/notifications", json={
        "category": "interview_reminder",
        "title": "Onsite Round 1",
        "description": "Prep distributed systems.",
        "priority": "urgent",
    }, headers=headers)

    # 2. Unread normal message
    await client.post("/api/notifications", json={
        "category": "message",
        "title": "New Chat Message",
        "description": "Hey Alex!",
        "priority": "normal",
    }, headers=headers)

    # 3. Read urgent deadline
    res3 = await client.post("/api/notifications", json={
        "category": "application_deadline",
        "title": "Deadline Alert",
        "description": "Submit resume.",
        "priority": "urgent",
    }, headers=headers)
    notif3_id = res3.json()["id"]
    await client.patch(f"/api/notifications/{notif3_id}/read", headers=headers)

    # Filter isRead=false -> exactly 2
    unread_res = await client.get("/api/notifications?isRead=false", headers=headers)
    assert unread_res.status_code == 200
    assert len(unread_res.json()) == 2
    assert all(n["isRead"] is False for n in unread_res.json())

    # Filter category=interview_reminder -> exactly 1
    cat_res = await client.get("/api/notifications?category=interview_reminder", headers=headers)
    assert cat_res.status_code == 200
    assert len(cat_res.json()) == 1
    assert cat_res.json()[0]["category"] == "interview_reminder"

    # Filter priority=urgent -> exactly 2
    prio_res = await client.get("/api/notifications?priority=urgent", headers=headers)
    assert prio_res.status_code == 200
    assert len(prio_res.json()) == 2

    # Verify unread count endpoint
    count_res = await client.get("/api/notifications/unread-count", headers=headers)
    assert count_res.status_code == 200
    assert count_res.json()["unreadCount"] == 2
    assert count_res.json()["count"] == 2

    # Mark all read
    read_all = await client.post("/api/notifications/read-all", headers=headers)
    assert read_all.status_code == 200
    assert read_all.json()["success"] is True

    # Unread count is now 0
    count_after = await client.get("/api/notifications/unread-count", headers=headers)
    assert count_after.json()["unreadCount"] == 0


@pytest.mark.asyncio
async def test_notification_service_events_and_deduplication(client):
    uid, token = await register_user(client, "events@notiftest.io", "Events Tester")
    headers = {"Authorization": f"Bearer {token}"}
    db = DatabaseManager.db

    # 1. New message event
    msg_notif1 = await NotificationService.notify_new_message(
        db=db,
        recipient_id=uid,
        sender_name="Marcus Vance",
        message_preview="Are you using Kafka CDC?",
        conversation_id="conv_123",
        message_id="msg_999",
    )
    assert msg_notif1["category"] == "message"
    assert "Marcus Vance" in msg_notif1["title"]

    # Deduplication test: sending same message event again
    msg_notif2 = await NotificationService.notify_new_message(
        db=db,
        recipient_id=uid,
        sender_name="Marcus Vance",
        message_preview="Are you using Kafka CDC?",
        conversation_id="conv_123",
        message_id="msg_999",
    )
    assert msg_notif2["id"] == msg_notif1["id"]

    # 2. Connection request event
    conn_notif1 = await NotificationService.notify_connection_request(
        db=db,
        recipient_id=uid,
        requester_name="Chloe Nguyen",
        requester_company="Linear",
        note="Love your open source project!",
        request_id="req_456",
    )
    assert conn_notif1["category"] == "connection_request"

    # Deduplication test: same request event again
    conn_notif2 = await NotificationService.notify_connection_request(
        db=db,
        recipient_id=uid,
        requester_name="Chloe Nguyen",
        requester_company="Linear",
        note="Love your open source project!",
        request_id="req_456",
    )
    assert conn_notif2["id"] == conn_notif1["id"]

    # 3. Application deadline event
    dead_notif1 = await NotificationService.notify_application_deadline(
        db=db,
        user_id=uid,
        company="Stripe",
        role_title="Senior Backend Engineer",
        deadline_date="2026-09-15",
        application_id="app_789",
    )
    assert dead_notif1["category"] == "application_deadline"

    # 4. Upcoming interview event
    inter_notif1 = await NotificationService.notify_upcoming_interview(
        db=db,
        user_id=uid,
        company="Datadog",
        interview_round="System Design Round",
        interview_date="2026-09-10 14:00",
        application_id="app_101",
    )
    assert inter_notif1["category"] == "interview_reminder"

    # 5. Job recommendation event
    job_notif1 = await NotificationService.notify_job_recommendation(
        db=db,
        user_id=uid,
        job_id="job_555",
        company="Vercel",
        title="Frontend Platform Engineer",
        match_score=95,
    )
    assert job_notif1["category"] == "job_recommendation"

    # Verify total notifications list has exactly 5 unique notifications (no duplicates)
    list_res = await client.get("/api/notifications", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 5
