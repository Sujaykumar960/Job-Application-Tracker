import io
import json
import httpx
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def async_client():
    await DatabaseManager.connect()
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
        await db.profiles.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
        await db.jobs.delete_many({"company": "MatrixTech Corp"})
        await db.applications.delete_many({"company": "Stripe Matrix"})
        await db.posts.delete_many({"content": {"$regex": ".*Raft Consensus.*"}})
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
        await db.profiles.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
        await db.jobs.delete_many({"company": "MatrixTech Corp"})
        await db.applications.delete_many({"company": "Stripe Matrix"})
        await db.posts.delete_many({"content": {"$regex": ".*Raft Consensus.*"}})


@pytest.fixture
def sync_client():
    from pymongo import MongoClient
    mc = MongoClient("mongodb://localhost:27017")
    db = mc["careerx_db"]
    db.users.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
    db.profiles.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
    with TestClient(app) as tc:
        yield tc
    db.users.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})
    db.profiles.delete_many({"email": {"$regex": ".*@matrix\\.io$"}})


# Helper to register user
async def register_user(client: httpx.AsyncClient, name: str, email: str, role: str = "seeker"):
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Failed registration: {res.text}"
    return res.json()


# ==========================================
# 1. AUTH SUITE
# ==========================================
class TestAuthSuite:
    @pytest.mark.asyncio
    async def test_auth_register_and_login(self, async_client):
        # Register
        reg = await register_user(async_client, "Auth Test User", "user_auth@matrix.io", "seeker")
        assert "access_token" in reg
        assert reg["user"]["email"] == "user_auth@matrix.io"

        # Login
        login_res = await async_client.post("/api/auth/login", json={
            "email": "user_auth@matrix.io",
            "password": "Password123!",
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

    @pytest.mark.asyncio
    async def test_auth_invalid_login(self, async_client):
        # Wrong password
        res = await async_client.post("/api/auth/login", json={
            "email": "user_auth@matrix.io",
            "password": "WrongPassword!",
        })
        assert res.status_code == 401

        # Nonexistent email
        res_non = await async_client.post("/api/auth/login", json={
            "email": "nobody@matrix.io",
            "password": "Password123!",
        })
        assert res_non.status_code == 401

    @pytest.mark.asyncio
    async def test_auth_protected_route_and_jwt_validation(self, async_client):
        # Without token -> 401
        unauth = await async_client.get("/api/auth/me")
        assert unauth.status_code == 401

        # With invalid/garbage JWT -> 401
        invalid = await async_client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.xyz"})
        assert invalid.status_code == 401

    @pytest.mark.asyncio
    async def test_auth_role_authorization(self, async_client):
        # Seeker registration
        seeker = await register_user(async_client, "Seeker User", "seeker_role@matrix.io", "seeker")
        seeker_token = seeker["access_token"]

        # Recruiter registration
        recruiter = await register_user(async_client, "Recruiter User", "recruiter_role@matrix.io", "recruiter")
        recruiter_token = recruiter["access_token"]

        # Seeker blocked from recruiter candidate API
        res_blocked = await async_client.get(
            "/api/recruiter/candidates",
            headers={"Authorization": f"Bearer {seeker_token}"},
        )
        assert res_blocked.status_code == 403

        # Recruiter allowed
        res_allowed = await async_client.get(
            "/api/recruiter/candidates",
            headers={"Authorization": f"Bearer {recruiter_token}"},
        )
        assert res_allowed.status_code == 200


# ==========================================
# 2. USERS SUITE
# ==========================================
class TestUsersSuite:
    @pytest.mark.asyncio
    async def test_users_get_and_update_profile(self, async_client):
        user = await register_user(async_client, "Profile User", "profile_test@matrix.io", "seeker")
        token = user["access_token"]
        uid = user["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get own profile
        me_res = await async_client.get("/api/users/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["name"] == "Profile User"

        # Update own profile
        update_res = await async_client.patch(
            "/api/users/me",
            json={"headline": "Staff Distributed Systems Engineer", "location": "San Francisco, CA"},
            headers=headers,
        )
        assert update_res.status_code == 200
        assert update_res.json()["headline"] == "Staff Distributed Systems Engineer"

        # Get profile by ID
        get_id_res = await async_client.get(f"/api/users/{uid}")
        assert get_id_res.status_code == 200
        assert get_id_res.json()["headline"] == "Staff Distributed Systems Engineer"

    @pytest.mark.asyncio
    async def test_users_unauthorized_profile_access(self, async_client):
        # Updating without authorization -> 401
        res = await async_client.patch("/api/users/me", json={"headline": "Hacker"})
        assert res.status_code == 401


# ==========================================
# 3. JOBS SUITE
# ==========================================
class TestJobsSuite:
    @pytest.mark.asyncio
    async def test_jobs_list_search_filter_pagination(self, async_client):
        # List jobs
        list_res = await async_client.get("/api/jobs")
        assert list_res.status_code == 200
        assert isinstance(list_res.json(), list)

        # Search
        search_res = await async_client.get("/api/jobs?search=engineer")
        assert search_res.status_code == 200

        # Filtering and pagination
        filter_res = await async_client.get("/api/jobs?workType=Remote&limit=5&skip=0")
        assert filter_res.status_code == 200

    @pytest.mark.asyncio
    async def test_jobs_create_update_delete_authorization(self, async_client):
        seeker = await register_user(async_client, "Job Seeker", "seeker_job@matrix.io", "seeker")
        recruiter = await register_user(async_client, "Job Recruiter", "recruiter_job@matrix.io", "recruiter")

        seeker_headers = {"Authorization": f"Bearer {seeker['access_token']}"}
        recruiter_headers = {"Authorization": f"Bearer {recruiter['access_token']}"}

        job_payload = {
            "title": "Cloud Platform Architect",
            "company": "MatrixTech Corp",
            "location": "Remote",
            "salaryRange": "$190,000 - $230,000",
            "workType": "Remote",
            "jobType": "Full-time",
            "experienceLevel": "Senior",
            "roleCategory": "Cloud",
            "skills": [{"name": "Go", "isMatched": False}],
            "requiredSkills": ["Go", "Kubernetes"],
            "description": "Lead multi-region Kubernetes platform engineering.",
        }

        # 1. Seeker attempted create -> 403 Forbidden
        seeker_create = await async_client.post("/api/jobs", json=job_payload, headers=seeker_headers)
        assert seeker_create.status_code == 403

        # 2. Recruiter create -> 201 Created
        recruiter_create = await async_client.post("/api/jobs", json=job_payload, headers=recruiter_headers)
        assert recruiter_create.status_code == 201
        job_id = recruiter_create.json()["id"]

        # 3. Job Details
        details_res = await async_client.get(f"/api/jobs/{job_id}")
        assert details_res.status_code == 200
        assert details_res.json()["title"] == "Cloud Platform Architect"

        # 4. Seeker attempted update -> 403 Forbidden
        seeker_update = await async_client.patch(
            f"/api/jobs/{job_id}",
            json={"title": "Unauthorized Title"},
            headers=seeker_headers,
        )
        assert seeker_update.status_code == 403

        # 5. Recruiter update -> 200 OK
        recruiter_update = await async_client.patch(
            f"/api/jobs/{job_id}",
            json={"title": "Principal Cloud Architect"},
            headers=recruiter_headers,
        )
        assert recruiter_update.status_code == 200
        assert recruiter_update.json()["title"] == "Principal Cloud Architect"

        # 6. Seeker attempted delete -> 403 Forbidden
        seeker_del = await async_client.delete(f"/api/jobs/{job_id}", headers=seeker_headers)
        assert seeker_del.status_code == 403

        # 7. Recruiter delete -> 200 OK
        recruiter_del = await async_client.delete(f"/api/jobs/{job_id}", headers=recruiter_headers)
        assert recruiter_del.status_code == 200


# ==========================================
# 4. APPLICATIONS SUITE
# ==========================================
class TestApplicationsSuite:
    @pytest.mark.asyncio
    async def test_applications_lifecycle_and_ownership(self, async_client):
        user_a = await register_user(async_client, "App User A", "app_user_a@matrix.io", "seeker")
        user_b = await register_user(async_client, "App User B", "app_user_b@matrix.io", "seeker")

        headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
        headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

        # 1. Create Application for User A
        app_payload = {
            "company": "Stripe Matrix",
            "role": "Distributed Systems Engineer",
            "status": "Applied",
            "priority": "High",
            "deadline": "2026-12-31",
            "interviewDate": "2026-11-15",
            "salary": "$175,000",
            "location": "San Francisco, CA",
            "notes": "Referral from tech lead.",
            "tags": ["Fintech", "Go"],
        }
        create_res = await async_client.post("/api/applications", json=app_payload, headers=headers_a)
        assert create_res.status_code == 201
        app_id = create_res.json()["id"]

        # 2. Status Change and Update
        patch_res = await async_client.patch(
            f"/api/applications/{app_id}",
            json={"status": "Interview", "notes": "Passed technical phone screen"},
            headers=headers_a,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "Interview"

        # 3. Ownership Protection: User B cannot access or modify User A's application
        b_get = await async_client.get(f"/api/applications/{app_id}", headers=headers_b)
        assert b_get.status_code == 404

        b_patch = await async_client.patch(
            f"/api/applications/{app_id}",
            json={"status": "Rejected"},
            headers=headers_b,
        )
        assert b_patch.status_code == 404

        b_del = await async_client.delete(f"/api/applications/{app_id}", headers=headers_b)
        assert b_del.status_code == 404

        # 4. Statistics and Upcoming Queries
        stats_res = await async_client.get("/api/applications/stats", headers=headers_a)
        assert stats_res.status_code == 200
        assert stats_res.json()["totalApplications"] >= 1

        upcoming_res = await async_client.get("/api/applications?upcoming=true", headers=headers_a)
        assert upcoming_res.status_code == 200

        # 5. Delete Application by Owner
        del_res = await async_client.delete(f"/api/applications/{app_id}", headers=headers_a)
        assert del_res.status_code == 200


# ==========================================
# 5. FEED SUITE
# ==========================================
class TestFeedSuite:
    @pytest.mark.asyncio
    async def test_feed_crud_likes_saves_comments(self, async_client):
        user_author = await register_user(async_client, "Feed Author", "author_feed@matrix.io", "seeker")
        user_peer = await register_user(async_client, "Feed Peer", "peer_feed@matrix.io", "seeker")

        headers_author = {"Authorization": f"Bearer {user_author['access_token']}"}
        headers_peer = {"Authorization": f"Bearer {user_peer['access_token']}"}

        # 1. Create Post
        post_payload = {
            "content": "Exploring Raft Consensus in Go 1.23.",
            "type": "Technical Discussion",
            "tags": ["Go", "Distributed Systems", "Raft"],
            "codeSnippet": "func ElectionTimeout() { ... }",
        }
        create_res = await async_client.post("/api/feed/posts", json=post_payload, headers=headers_author)
        assert create_res.status_code == 201
        post_id = create_res.json()["id"]

        # 2. Update Post by Author
        patch_res = await async_client.patch(
            f"/api/feed/posts/{post_id}",
            json={"content": "Exploring Raft Consensus in Go 1.23 with Leader Lease."},
            headers=headers_author,
        )
        assert patch_res.status_code == 200
        assert "Leader Lease" in patch_res.json()["content"]

        # 3. Peer unauthorized update -> 403 Forbidden
        peer_patch = await async_client.patch(
            f"/api/feed/posts/{post_id}",
            json={"content": "Defaced post"},
            headers=headers_peer,
        )
        assert peer_patch.status_code == 403

        # 4. Likes lifecycle & duplicate prevention
        like_res = await async_client.post(f"/api/feed/posts/{post_id}/like", headers=headers_peer)
        assert like_res.status_code == 200
        assert like_res.json()["isLiked"] is True
        initial_likes = like_res.json()["likesCount"]

        # Duplicate like idempotent
        like_dup = await async_client.post(f"/api/feed/posts/{post_id}/like", headers=headers_peer)
        assert like_dup.status_code == 200
        assert like_dup.json()["likesCount"] == initial_likes

        # Unlike
        unlike_res = await async_client.delete(f"/api/feed/posts/{post_id}/like", headers=headers_peer)
        assert unlike_res.status_code == 200
        assert unlike_res.json()["isLiked"] is False

        # 5. Saves / Bookmarks lifecycle
        save_res = await async_client.post(f"/api/feed/posts/{post_id}/save", headers=headers_peer)
        assert save_res.status_code == 200
        assert save_res.json()["isSaved"] is True

        unsave_res = await async_client.delete(f"/api/feed/posts/{post_id}/save", headers=headers_peer)
        assert unsave_res.status_code == 200
        assert unsave_res.json()["isSaved"] is False

        # 6. Comments
        comment_res = await async_client.post(
            f"/api/feed/posts/{post_id}/comments",
            json={"content": "Insightful distributed systems breakdown!"},
            headers=headers_peer,
        )
        assert comment_res.status_code == 201
        comment_id = comment_res.json()["id"]

        # Delete Post by Author
        del_post = await async_client.delete(f"/api/feed/posts/{post_id}", headers=headers_author)
        assert del_post.status_code == 200


# ==========================================
# 6. NETWORK SUITE
# ==========================================
class TestNetworkSuite:
    @pytest.mark.asyncio
    async def test_network_lifecycle(self, async_client):
        u1 = await register_user(async_client, "Net One", "net1@matrix.io", "seeker")
        u2 = await register_user(async_client, "Net Two", "net2@matrix.io", "seeker")

        h1 = {"Authorization": f"Bearer {u1['access_token']}"}
        h2 = {"Authorization": f"Bearer {u2['access_token']}"}

        u2_id = u2["user"]["id"]
        u1_id = u1["user"]["id"]

        # 1. Send Request
        req_res = await async_client.post(
            f"/api/network/users/{u2_id}/connect",
            json={"note": "Let's connect!"},
            headers=h1,
        )
        assert req_res.status_code == 201

        # 2. Duplicate Request Prevention
        dup_res = await async_client.post(
            f"/api/network/users/{u2_id}/connect",
            json={},
            headers=h1,
        )
        assert dup_res.status_code == 400

        # 3. Fetch incoming requests on User 2
        in_res = await async_client.get("/api/network/requests", headers=h2)
        assert in_res.status_code == 200
        incoming = in_res.json()
        assert len(incoming) >= 1
        req_item = next(r for r in incoming if r["id"] == u1_id)
        req_id = req_item["requestId"]

        # 4. Accept Request
        accept_res = await async_client.post(f"/api/network/requests/{req_id}/accept", headers=h2)
        assert accept_res.status_code == 200

        # 5. Follow / Unfollow
        follow_res = await async_client.post(f"/api/network/follow/{u2_id}", headers=h1)
        assert follow_res.status_code == 200
        assert follow_res.json()["following"] is True

        unfollow_res = await async_client.delete(f"/api/network/users/{u2_id}/follow", headers=h1)
        assert unfollow_res.status_code == 200
        assert unfollow_res.json()["following"] is False

        # 6. Disconnect
        disc_res = await async_client.delete(f"/api/network/connections/{u2_id}", headers=h1)
        assert disc_res.status_code == 200


# ==========================================
# 7. NOTIFICATIONS SUITE
# ==========================================
class TestNotificationsSuite:
    @pytest.mark.asyncio
    async def test_notifications_lifecycle_and_ownership(self, async_client):
        u1 = await register_user(async_client, "Notif User 1", "notif1@matrix.io", "seeker")
        u2 = await register_user(async_client, "Notif User 2", "notif2@matrix.io", "seeker")

        h1 = {"Authorization": f"Bearer {u1['access_token']}"}
        h2 = {"Authorization": f"Bearer {u2['access_token']}"}

        # Create notification for U1
        create_res = await async_client.post(
            "/api/notifications",
            json={
                "category": "connection_request",
                "title": "New Connection Request",
                "description": "Notif User 2 wants to connect with you.",
                "priority": "normal",
                "company": "Tech Corp",
            },
            headers=h1,
        )
        assert create_res.status_code == 201
        nid = create_res.json()["id"]

        # 1. List notifications for U1
        notifs_res = await async_client.get("/api/notifications", headers=h1)
        assert notifs_res.status_code == 200
        notifs = notifs_res.json()
        assert len(notifs) >= 1

        # 2. Unread Count
        count_res = await async_client.get("/api/notifications/unread-count", headers=h1)
        assert count_res.status_code == 200
        assert count_res.json()["unreadCount"] >= 1

        # 3. Ownership Isolation: U2 cannot mark U1's notification as read
        u2_read = await async_client.patch(f"/api/notifications/{nid}/read", headers=h2)
        assert u2_read.status_code == 404

        # 4. Mark Read by Owner
        u1_read = await async_client.patch(f"/api/notifications/{nid}/read", headers=h1)
        assert u1_read.status_code == 200
        assert u1_read.json()["success"] is True

        # 5. Read All
        read_all_res = await async_client.post("/api/notifications/read-all", headers=h1)
        assert read_all_res.status_code == 200


# ==========================================
# 8. MESSAGING SUITE
# ==========================================
class TestMessagingSuite:
    @pytest.mark.asyncio
    async def test_messaging_lifecycle(self, async_client):
        u1 = await register_user(async_client, "Msg User 1", "msg1@matrix.io", "seeker")
        u2 = await register_user(async_client, "Msg User 2", "msg2@matrix.io", "seeker")
        u3 = await register_user(async_client, "Msg User 3", "msg3@matrix.io", "seeker")

        h1 = {"Authorization": f"Bearer {u1['access_token']}"}
        h2 = {"Authorization": f"Bearer {u2['access_token']}"}
        h3 = {"Authorization": f"Bearer {u3['access_token']}"}

        # 1. Create Conversation between U1 and U2
        conv_res = await async_client.post(
            "/api/messages/conversations",
            json={"peerId": u2["user"]["id"], "initialMessage": "Hello there!"},
            headers=h1,
        )
        assert conv_res.status_code == 201
        conv_id = conv_res.json()["id"]

        # 2. List Conversations
        list_res = await async_client.get("/api/messages/conversations", headers=h1)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 3. Send Message
        msg_res = await async_client.post(
            f"/api/messages/conversations/{conv_id}/messages",
            json={"content": "Follow-up message."},
            headers=h2,
        )
        assert msg_res.status_code == 201
        msg_id = msg_res.json()["id"]

        # 4. Message Authorization: Outsider U3 cannot read conversation
        u3_get = await async_client.get(f"/api/messages/conversations/{conv_id}", headers=h3)
        assert u3_get.status_code == 403

        # 5. Mark Message as Read
        read_res = await async_client.patch(f"/api/messages/{msg_id}/read", headers=h1)
        assert read_res.status_code == 200


# ==========================================
# 9. WEBSOCKET SUITE
# ==========================================
class TestWebSocketSuite:
    def test_websocket_lifecycle(self, sync_client):
        # Register user
        reg_res = sync_client.post("/api/auth/register", json={
            "name": "WS User",
            "email": "ws_matrix@matrix.io",
            "password": "Password123!",
            "role": "seeker",
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        uid = reg_res.json()["user"]["id"]

        # 1. Unauthenticated connection rejected
        with pytest.raises(Exception):
            with sync_client.websocket_connect("/api/ws/chat"):
                pass

        # 2. Authenticated connection & presence
        with sync_client.websocket_connect(f"/api/ws/chat?token={token}") as ws:
            # Query presence
            ws.send_text(json.dumps({"type": "presence", "payload": {}}))
            res_text = ws.receive_text()
            data = json.loads(res_text)
            assert data["type"] == "presence"

            # Ping / Pong
            ws.send_text(json.dumps({"type": "ping", "payload": {}}))
            pong_data = json.loads(ws.receive_text())
            assert pong_data["type"] == "pong"

            # Invalid / malformed JSON payload handling
            ws.send_text("MALFORMED JSON {{{")
            err_data = json.loads(ws.receive_text())
            assert err_data["type"] == "error"

            # Unauthorized conversation access
            ws.send_text(json.dumps({
                "type": "message",
                "payload": {"conversationId": "nonexistent_conv", "content": "Hello"},
            }))
            conv_err = json.loads(ws.receive_text())
            assert conv_err["type"] == "error"


# ==========================================
# 10. RECRUITER SUITE
# ==========================================
class TestRecruiterSuite:
    @pytest.mark.asyncio
    async def test_recruiter_features(self, async_client):
        recruiter = await register_user(async_client, "Lead Recruiter", "recruiter_full@matrix.io", "recruiter")
        headers = {"Authorization": f"Bearer {recruiter['access_token']}"}

        # 1. Candidate Search & Filtering
        search_res = await async_client.get("/api/recruiter/candidates?search=Go", headers=headers)
        assert search_res.status_code == 200
        candidates = search_res.json()
        assert len(candidates) >= 1
        cand_id = candidates[0]["id"]

        # 2. Candidate Detail
        cand_detail = await async_client.get(f"/api/recruiter/candidates/{cand_id}", headers=headers)
        assert cand_detail.status_code == 200

        # 3. Shortlist candidate
        shortlist_res = await async_client.post(
            f"/api/recruiter/candidates/{cand_id}/shortlist",
            json={"isShortlisted": True},
            headers=headers,
        )
        assert shortlist_res.status_code == 200
        assert shortlist_res.json()["isShortlisted"] is True

        # 4. Interview Stage Progression
        stage_res = await async_client.patch(
            f"/api/recruiter/candidates/{cand_id}/interview-stage",
            json={"interviewStage": "Technical Onsite"},
            headers=headers,
        )
        assert stage_res.status_code == 200
        assert stage_res.json()["interviewStage"] == "Technical Onsite"


# ==========================================
# 11. FILES SUITE
# ==========================================
class TestFilesSuite:
    @pytest.mark.asyncio
    async def test_files_lifecycle(self, async_client):
        u1 = await register_user(async_client, "File User 1", "file1@matrix.io", "seeker")
        u2 = await register_user(async_client, "File User 2", "file2@matrix.io", "seeker")

        h1 = {"Authorization": f"Bearer {u1['access_token']}"}
        h2 = {"Authorization": f"Bearer {u2['access_token']}"}

        # 1. Valid PDF upload with magic bytes
        pdf_bytes = b"%PDF-1.4 Mock PDF Content For Matrix Test"
        files = {"file": ("matrix_resume.pdf", pdf_bytes, "application/pdf")}
        upload_res = await async_client.post(
            "/api/files/upload",
            files=files,
            data={"purpose": "resume"},
            headers=h1,
        )
        assert upload_res.status_code == 201
        file_id = upload_res.json()["id"]

        # 2. Download by Owner
        down_res = await async_client.get(f"/api/files/{file_id}", headers=h1)
        assert down_res.status_code == 200
        assert down_res.content == pdf_bytes

        # 3. Download authorization: Other seeker cannot download private resume
        unauth_down = await async_client.get(f"/api/files/{file_id}", headers=h2)
        assert unauth_down.status_code == 403

        # 4. Invalid file type rejected
        invalid_files = {"file": ("malicious.exe", b"MZexecutable_code", "application/x-msdownload")}
        invalid_res = await async_client.post("/api/files/upload", files=invalid_files, headers=h1)
        assert invalid_res.status_code == 400

        # 5. Oversized file rejected (> 10MB)
        huge_bytes = b"%PDF-" + b"0" * (11 * 1024 * 1024)
        huge_files = {"file": ("huge.pdf", huge_bytes, "application/pdf")}
        oversized_res = await async_client.post("/api/files/upload", files=huge_files, headers=h1)
        assert oversized_res.status_code == 413

        # 6. Deletion by Owner
        del_res = await async_client.delete(f"/api/files/{file_id}", headers=h1)
        assert del_res.status_code == 200
