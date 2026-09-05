import pytest
import pytest_asyncio
import httpx

from app.database import DatabaseManager
from app.main import app
from app.utils.helpers import utc_now_iso


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.applications.delete_many({"userId": {"$regex": ".*"}})
        await db.notifications.delete_many({"userId": {"$regex": ".*"}})
        await db.conversations.delete_many({})
        await db.messages.delete_many({})
        await db.connection_requests.delete_many({})
        await db.saved_jobs.delete_many({"userId": {"$regex": ".*"}})
        await db.progress.delete_many({"userId": {"$regex": ".*"}})
        await db.users.delete_many({"email": {"$regex": ".*@dashtest\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker") -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    return user_id, token


@pytest.mark.asyncio
async def test_dashboard_unauthenticated_rejected(client):
    res_ov = await client.get("/api/dashboard/overview")
    assert res_ov.status_code == 401

    res_act = await client.get("/api/dashboard/activity")
    assert res_act.status_code == 401


@pytest.mark.asyncio
async def test_empty_dashboard_overview(client):
    uid, token = await register_user(client, "fresh.seeker@dashtest.io", "Fresh Seeker")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/dashboard/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["profile"]["name"] == "Fresh Seeker"
    assert data["applications"]["total"] == 0
    assert data["applications"]["applied"] == 0
    assert data["applications"]["interviewing"] == 0
    assert data["applications"]["offered"] == 0
    assert data["applications"]["rejected"] == 0
    assert data["applications"]["wishlist"] == 0
    assert data["upcomingInterviews"] == []
    assert data["upcomingDeadlines"] == []
    assert data["unreadNotificationsCount"] == 0
    assert data["unreadMessagesCount"] == 0
    assert data["connectionRequestsCount"] == 0
    assert data["savedJobsCount"] == 0


@pytest.mark.asyncio
async def test_populated_dashboard_overview(client):
    uid, token = await register_user(client, "active.seeker@dashtest.io", "Active Seeker")
    headers = {"Authorization": f"Bearer {token}"}
    db = DatabaseManager.db

    # 1. Insert applications
    await db.applications.insert_many([
        {
            "userId": uid,
            "companyName": "Stripe",
            "roleTitle": "Backend Engineer",
            "status": "Applied",
            "deadline": "2026-09-20",
            "createdAt": "2026-09-01T10:00:00Z",
        },
        {
            "userId": uid,
            "companyName": "Datadog",
            "roleTitle": "Platform Engineer",
            "status": "Interviewing",
            "interviewDate": "2026-09-10T14:00:00Z",
            "createdAt": "2026-09-02T11:00:00Z",
        },
        {
            "userId": uid,
            "companyName": "Netflix",
            "roleTitle": "Senior SRE",
            "status": "Offer",
            "createdAt": "2026-09-02T12:00:00Z",
        },
        {
            "userId": uid,
            "companyName": "Meta",
            "roleTitle": "Infrastructure Engineer",
            "status": "Rejected",
            "createdAt": "2026-09-03T09:00:00Z",
        },
    ])

    # 2. Insert notifications (2 unread, 1 read)
    await db.notifications.insert_many([
        {"userId": uid, "title": "Interview Reminder", "description": "Prep for Datadog", "isRead": False, "createdAt": "2026-09-03T10:00:00Z"},
        {"userId": uid, "title": "Application Deadline", "description": "Stripe deadline", "isRead": False, "createdAt": "2026-09-03T11:00:00Z"},
        {"userId": uid, "title": "Old Notice", "description": "Already read", "isRead": True, "createdAt": "2026-09-01T08:00:00Z"},
    ])

    # 3. Insert conversation with unread count
    await db.conversations.insert_one({
        "participants": [uid, "peer_999"],
        "unreadCounts": {uid: 3, "peer_999": 0},
        "lastMessage": "Looking forward to speaking!",
        "lastMessageTime": "2026-09-03T12:00:00Z",
    })

    # 4. Insert pending connection request
    await db.connection_requests.insert_one({
        "senderId": "peer_888",
        "recipientId": uid,
        "status": "Pending",
        "createdAt": "2026-09-03T08:30:00Z",
    })

    # 5. Insert saved job
    await db.saved_jobs.insert_one({"userId": uid, "jobId": "job_stripe_1"})

    # 6. Insert progress record
    await db.progress.insert_one({
        "userId": uid,
        "questionsSolved": 55,
        "totalQuestions": 150,
        "accuracy": 92.5,
        "streakDays": 12,
    })

    # Fetch overview
    res = await client.get("/api/dashboard/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Verify calculated metrics
    apps = data["applications"]
    assert apps["total"] == 4
    assert apps["applied"] == 1
    assert apps["interviewing"] == 1
    assert apps["offered"] == 1
    assert apps["rejected"] == 1

    # Verify upcoming items
    assert len(data["upcomingInterviews"]) == 1
    assert data["upcomingInterviews"][0]["company"] == "Datadog"
    assert data["upcomingInterviews"][0]["date"] == "2026-09-10T14:00:00Z"

    assert len(data["upcomingDeadlines"]) == 1
    assert data["upcomingDeadlines"][0]["company"] == "Stripe"

    # Verify unread counters
    assert data["unreadNotificationsCount"] == 2
    assert data["unreadMessagesCount"] == 3
    assert data["connectionRequestsCount"] == 1
    assert data["savedJobsCount"] == 1

    # Verify learning progress
    assert data["learningProgress"]["questionsSolved"] == 55
    assert data["learningProgress"]["streakDays"] == 12


@pytest.mark.asyncio
async def test_dashboard_activity_timeline(client):
    uid, token = await register_user(client, "activity.seeker@dashtest.io", "Activity Seeker")
    headers = {"Authorization": f"Bearer {token}"}
    db = DatabaseManager.db

    # Insert events across multiple sources with staggered timestamps
    await db.applications.insert_one({
        "userId": uid,
        "companyName": "Linear",
        "roleTitle": "Product Engineer",
        "status": "Applied",
        "appliedDate": "2026-09-03T08:00:00Z",
        "createdAt": "2026-09-03T08:00:00Z",
    })

    await db.notifications.insert_one({
        "userId": uid,
        "title": "Welcome to CareerX",
        "description": "Profile 85% complete",
        "createdAt": "2026-09-03T09:00:00Z",
    })

    await db.messages.insert_one({
        "conversationId": "conv_act_1",
        "senderId": "recruiter_jane",
        "senderName": "Jane Recruiter",
        "recipientId": uid,
        "content": "Hi! We'd love to invite you for an interview.",
        "timestamp": "2026-09-03T10:00:00Z",
        "createdAt": "2026-09-03T10:00:00Z",
    })

    res = await client.get("/api/dashboard/activity?limit=10", headers=headers)
    assert res.status_code == 200
    data = res.json()

    activities = data["activities"]
    assert len(activities) >= 3

    # Check chronological ordering (descending: newest first)
    timestamps = [a["timestamp"] for a in activities]
    assert timestamps == sorted(timestamps, reverse=True)

    # Check presence of distinct activity types
    types = {a["type"] for a in activities}
    assert "application" in types
    assert "notification" in types
    assert "message" in types
