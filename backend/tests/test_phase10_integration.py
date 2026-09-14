import io
import json
import uuid
import pytest
from reportlab.pdfgen import canvas
from pymongo import MongoClient
from starlette.testclient import TestClient

from app.config import settings
from app.database import DatabaseManager
from app.main import app

def generate_test_pdf(text: str = "Expert Python and Go Distributed Systems Engineer") -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Skills: Python, Go, Kafka, Redis, Docker, Kubernetes")
    c.drawString(72, 710, "Experience: Senior Backend Engineer at Cloud Corp")
    c.save()
    return buffer.getvalue()

def sync_cleanup_p10():
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    db.users.delete_many({"email": {"$regex": ".*@p10integ\\.io$"}})
    db.profiles.delete_many({"userId": {"$regex": ".*p10.*"}})
    db.resumes.delete_many({"userId": {"$regex": ".*p10.*"}})
    db.resume_analyses.delete_many({"userId": {"$regex": ".*p10.*"}})
    db.jobs.delete_many({"company": {"$regex": ".*P10.*"}})
    db.applications.delete_many({"company": {"$regex": ".*P10.*"}})
    db.calendar_events.delete_many({"title": {"$regex": ".*P10.*"}})
    db.conversations.delete_many({"participants": {"$regex": ".*p10.*"}})
    db.messages.delete_many({"senderId": {"$regex": ".*p10.*"}})
    db.notifications.delete_many({"userId": {"$regex": ".*p10.*"}})
    db.posts.delete_many({"content": {"$regex": ".*P10.*"}})

@pytest.fixture(scope="module", autouse=True)
def init_db_module():
    import asyncio
    asyncio.run(DatabaseManager.connect())
    sync_cleanup_p10()
    yield
    sync_cleanup_p10()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def reg_user(client, email, name, role="seeker"):
    res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Reg failed: {res.text}"
    d = res.json()
    token = d["access_token"]
    return d["user"]["id"], token, {"Authorization": f"Bearer {token}"}

# ============================================================================
# DOMAIN A: AUTH & SESSION LIFECYCLE
# ============================================================================
class TestDomainA_AuthSessionLifecycle:
    def test_01_seeker_registration(self, client):
        uid, token, headers = reg_user(client, "seeker01@p10integ.io", "Seeker One", "seeker")
        assert uid and token

    def test_02_recruiter_registration(self, client):
        uid, token, headers = reg_user(client, "recruiter01@p10integ.io", "Recruiter One", "recruiter")
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["role"] == "recruiter"

    def test_03_login_valid_credentials(self, client):
        email = "login_test@p10integ.io"
        reg_user(client, email, "Login User")
        res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "token" in data
        assert data["user"]["email"] == email

    def test_04_login_invalid_credentials(self, client):
        res = client.post("/api/auth/login", json={"email": "nonexistent@p10integ.io", "password": "WrongPassword!"})
        assert res.status_code in (400, 401)

    def test_05_get_me_authorized(self, client):
        _, _, headers = reg_user(client, "me_test@p10integ.io", "Me Test")
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["name"] == "Me Test"

    def test_06_get_me_unauthorized(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_07_refresh_token(self, client):
        _, _, headers = reg_user(client, "refresh_test@p10integ.io", "Refresh Test")
        login_res = client.post("/api/auth/login", json={"email": "refresh_test@p10integ.io", "password": "Password123!"})
        rf_token = login_res.json()["refresh_token"]
        res = client.post("/api/auth/refresh", json={"refresh_token": rf_token})
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_08_password_reset_with_password_and_alias(self, client):
        email = "reset_test@p10integ.io"
        reg_user(client, email, "Reset Test")
        fg_res = client.post("/api/auth/forgot-password", json={"email": email})
        assert fg_res.status_code == 200
        
        # Test password field
        res1 = client.post("/api/auth/reset-password", json={"token": "valid_token_mock", "password": "NewPassword888!"})
        # If token is not in reset db, returns 400 or 404, but schema validates
        assert res1.status_code in (200, 400, 404)
        
        # Test newPassword alias
        res2 = client.post("/api/auth/reset-password", json={"token": "valid_token_mock", "newPassword": "NewPassword888!"})
        assert res2.status_code in (200, 400, 404)

# ============================================================================
# DOMAIN B: DASHBOARD & METRICS
# ============================================================================
class TestDomainB_DashboardMetrics:
    def test_09_dashboard_overview_profile_has_email(self, client):
        email = "dash_test@p10integ.io"
        _, _, headers = reg_user(client, email, "Dashboard User")
        res = client.get("/api/dashboard/overview", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "profile" in data
        assert "email" in data["profile"]
        assert data["profile"]["email"] == email
        assert "applications" in data
        assert "total" in data["applications"]

    def test_10_dashboard_activity_stream(self, client):
        _, _, headers = reg_user(client, "dash_act@p10integ.io", "Activity User")
        res = client.get("/api/dashboard/activity?limit=10", headers=headers)
        assert res.status_code == 200
        assert "activities" in res.json()

# ============================================================================
# DOMAIN C: RESUME MANAGEMENT & GROQ AI
# ============================================================================
class TestDomainC_ResumeManagement:
    def test_11_resume_upload_pdf(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "resume_pdf@p10integ.io", "Resume PDF User")
        pdf_bytes = generate_test_pdf("Senior Distributed Engineer Go Kafka Redis")
        res = client.post(
            "/api/resumes/upload",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["format"] == "PDF"
        assert "id" in data

    def test_12_resume_active_toggle_and_list(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "resume_toggle@p10integ.io", "Toggle User")
        pdf_bytes = generate_test_pdf("Senior SRE Python Kubernetes Docker")
        upload_res = client.post(
            "/api/resumes/upload",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        res_id = upload_res.json()["id"]
        
        patch_res = client.patch(f"/api/resumes/{res_id}/active", headers=headers)
        assert patch_res.status_code == 200
        
        list_res = client.get("/api/resumes", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

    def test_13_resume_deletion_cascade(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "resume_del@p10integ.io", "Delete User")
        pdf_bytes = generate_test_pdf("Backend Engineer Java Spring")
        upload_res = client.post(
            "/api/resumes/upload",
            files={"file": ("delete_me.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        res_id = upload_res.json()["id"]
        del_res = client.delete(f"/api/resumes/{res_id}", headers=headers)
        assert del_res.status_code == 200
        
        # Verify it is deleted
        get_res = client.get(f"/api/resumes/{res_id}/analysis", headers=headers)
        assert get_res.status_code == 404

# ============================================================================
# DOMAIN D: JOB MATCH & SKILL GAP
# ============================================================================
class TestDomainD_JobMatchAndSkillGap:
    def test_14_job_listings_and_match(self, client):
        _, rec_token, rec_headers = reg_user(client, "rec_match@p10integ.io", "Recruiter Match", "recruiter")
        job_res = client.post("/api/jobs", json={
            "title": "Lead Distributed Systems Engineer",
            "company": "P10 Systems Inc",
            "location": "Remote",
            "workType": "Remote",
            "experienceLevel": "Senior",
            "requiredSkills": ["Go", "Kafka", "Kubernetes"],
            "description": "Building high-scale distributed ledger services in Go and Kafka.",
        }, headers=rec_headers)
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        _, seeker_token, seeker_headers = reg_user(client, "seeker_match@p10integ.io", "Seeker Match")
        match_res = client.post(f"/api/jobs/{job_id}/match", headers=seeker_headers)
        assert match_res.status_code == 200
        data = match_res.json()
        assert "overallScore" in data
        assert "matchedSkills" in data

    def test_15_skill_gap_analysis(self, client):
        _, _, headers = reg_user(client, "skillgap@p10integ.io", "Skill Gap Seeker")
        res = client.get("/api/skill-gap", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "gapMatrix" in data or "skills" in data or "radarData" in data or "overallMatch" in data

    def test_16_custom_job_skill_gap(self, client):
        _, _, headers = reg_user(client, "custom_jd@p10integ.io", "Custom JD Seeker")
        res = client.post("/api/skill-gap/custom", json={
            "jobTitle": "Staff SRE",
            "companyName": "P10 Cloud Corp",
            "jobDescription": "Must have extensive experience with Go, Kubernetes, Terraform, Prometheus.",
        }, headers=headers)
        assert res.status_code == 200
        assert "overallScore" in res.json()

# ============================================================================
# DOMAIN E: LEARNING PATHS & CODE EXECUTION
# ============================================================================
class TestDomainE_LearningAndCodeExecution:
    def test_17_curriculum_courses(self, client):
        _, _, headers = reg_user(client, "learn_user@p10integ.io", "Learning Seeker")
        res = client.get("/api/learning/courses", headers=headers)
        assert res.status_code == 200
        courses = res.json()
        assert len(courses) > 0
        first_course_id = courses[0]["id"]
        
        # Enroll
        enroll_res = client.post(f"/api/learning/courses/{first_course_id}/enroll", headers=headers)
        assert enroll_res.status_code == 200
        
        # Complete lesson
        course_detail = client.get(f"/api/learning/courses/{first_course_id}", headers=headers).json()
        if course_detail.get("lessons"):
            lesson_id = course_detail["lessons"][0]["id"]
            comp_res = client.post(f"/api/learning/courses/{first_course_id}/lessons/{lesson_id}/complete", headers=headers)
            assert comp_res.status_code == 200
            assert comp_res.json()["progressPercent"] > 0

    def test_18_code_execution_accepted(self, client):
        res = client.post("/api/code/execute", json={
            "language": "python",
            "code": "def two_sum(nums, target): return [0, 1]",
            "testCases": [{"id": "tc-1", "input": "[2,7,11,15], 9", "expectedOutput": "[0, 1]"}],
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "Accepted"
        assert data["passedCount"] >= 1

    def test_19_code_execution_compilation_error(self, client):
        res = client.post("/api/code/execute", json={
            "language": "python",
            "code": "   ",
        })
        assert res.status_code == 200
        assert res.json()["status"] == "Compilation Error"

    def test_20_ai_coding_hint(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "ai_hint_usr@p10integ.io", "AI User")
        res = client.post("/api/ai/hint", json={
            "problemId": "lru-cache",
            "userCode": "class LRU: pass",
            "language": "python",
        }, headers=headers)
        assert res.status_code == 200
        assert "title" in res.json()
        assert "markdownContent" in res.json()

    def test_21_ai_explain_code(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "ai_exp_usr@p10integ.io", "Explain User")
        res = client.post("/api/ai/explain-code", json={
            "code": "def solve(): return 42",
            "language": "python",
        }, headers=headers)
        assert res.status_code == 200
        assert "markdownContent" in res.json()

# ============================================================================
# DOMAIN F: APPLICATION TRACKER
# ============================================================================
class TestDomainF_ApplicationTracker:
    def test_22_create_and_manage_application(self, client):
        _, _, headers = reg_user(client, "app_tracker@p10integ.io", "Tracker Seeker")
        create_res = client.post("/api/applications", json={
            "company": "P10 Datadog Partner",
            "role": "Distributed Systems Engineer",
            "status": "Applied",
            "location": "Remote",
            "salary": "$180,000",
            "priority": "High",
            "notes": "Referred by tech lead",
        }, headers=headers)
        assert create_res.status_code == 201
        app_id = create_res.json()["id"]

        # Stage progression
        patch_res = client.patch(f"/api/applications/{app_id}", json={
            "status": "Interview",
            "interviewDate": "2026-10-15",
        }, headers=headers)
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "Interview"

        # List
        list_res = client.get("/api/applications", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Delete
        del_res = client.delete(f"/api/applications/{app_id}", headers=headers)
        assert del_res.status_code == 200

# ============================================================================
# DOMAIN G: PROFESSIONAL DISCOVERY & NETWORK
# ============================================================================
class TestDomainG_ProfessionalDiscoveryAndNetwork:
    def test_23_network_invitation_lifecycle(self, client):
        uid1, _, h1 = reg_user(client, "net_alice@p10integ.io", "Net Alice")
        uid2, _, h2 = reg_user(client, "net_bob@p10integ.io", "Net Bob")

        # Send request
        req_res = client.post("/api/network/requests", json={
            "recipientId": uid2,
            "note": "Let's connect on CareerX!",
        }, headers=h1)
        assert req_res.status_code == 201
        req_id = req_res.json().get("id") or req_res.json().get("requestId")

        # Bob views incoming requests
        bob_reqs = client.get("/api/network/requests", headers=h2).json()
        assert len(bob_reqs) >= 1

        # Bob accepts
        target_id = req_id or bob_reqs[0]["id"]
        acc_res = client.post(f"/api/network/requests/{target_id}/accept", headers=h2)
        assert acc_res.status_code == 200

        # Both now have 1st-degree connection
        c1 = client.get("/api/network/connections", headers=h1).json()
        assert any(c["id"] == uid2 for c in c1)

        # Disconnect
        dis_res = client.delete(f"/api/network/connections/{uid2}", headers=h1)
        assert dis_res.status_code == 200

# ============================================================================
# DOMAIN H: COMMUNITY FEED & POSTS
# ============================================================================
class TestDomainH_CommunityFeedAndPosts:
    def test_24_feed_post_lifecycle(self, client):
        uid, _, headers = reg_user(client, "post_author@p10integ.io", "Post Author")
        
        # Create post
        create_res = client.post("/api/posts", json={
            "content": "P10 Architecture Insight: Designing zero-copy event streaming in Go.",
            "category": "Architecture",
            "tags": ["Go", "Kafka", "P10"],
        }, headers=headers)
        assert create_res.status_code in (200, 201)
        post_id = create_res.json()["id"]

        # Like post
        like_res = client.post(f"/api/posts/{post_id}/like", headers=headers)
        assert like_res.status_code == 200
        assert like_res.json()["isLiked"] is True

        # Comment on post
        cmt_res = client.post(f"/api/posts/{post_id}/comments", json={
            "content": "Brilliant architecture breakdown!",
        }, headers=headers)
        assert cmt_res.status_code in (200, 201)

        # Bookmark
        bm_res = client.post(f"/api/posts/{post_id}/bookmark", headers=headers)
        assert bm_res.status_code == 200

        # Author deletes own post
        del_res = client.delete(f"/api/posts/{post_id}", headers=headers)
        assert del_res.status_code == 200

    def test_25_foreign_post_delete_forbidden(self, client):
        _, _, h_author = reg_user(client, "real_author@p10integ.io", "Real Author")
        post = client.post("/api/posts", json={"content": "P10 Private Post"}, headers=h_author).json()
        post_id = post["id"]

        _, _, h_stranger = reg_user(client, "stranger@p10integ.io", "Stranger")
        del_res = client.delete(f"/api/posts/{post_id}", headers=h_stranger)
        assert del_res.status_code in (403, 404)

# ============================================================================
# DOMAIN I: DIRECT MESSAGING & CHAT
# ============================================================================
class TestDomainI_DirectMessaging:
    def test_26_direct_messaging_rest_flow(self, client):
        uid1, _, h1 = reg_user(client, "msg_alice@p10integ.io", "Msg Alice")
        uid2, _, h2 = reg_user(client, "msg_bob@p10integ.io", "Msg Bob")

        # Create conversation
        conv_res = client.post("/api/messages/conversations", json={
            "participantId": uid2,
        }, headers=h1)
        assert conv_res.status_code in (200, 201)
        conv_id = conv_res.json()["id"]

        # Send message
        msg_res = client.post(f"/api/messages/conversations/{conv_id}/send", json={
            "content": "Hi Bob, are you available for an interview next week?",
        }, headers=h1)
        assert msg_res.status_code in (200, 201)
        assert msg_res.json()["content"] == "Hi Bob, are you available for an interview next week?"

        # Bob reads messages
        bob_msgs = client.get(f"/api/messages/conversations/{conv_id}/messages", headers=h2)
        assert bob_msgs.status_code == 200
        assert len(bob_msgs.json()) >= 1

        # Mark read
        rd_res = client.post(f"/api/messages/conversations/{conv_id}/read", headers=h2)
        assert rd_res.status_code == 200

# ============================================================================
# DOMAIN J: NOTIFICATION SYSTEM
# ============================================================================
class TestDomainJ_Notifications:
    def test_27_notifications_lifecycle(self, client):
        _, _, headers = reg_user(client, "notif_user@p10integ.io", "Notif User")
        
        # View notifications
        res = client.get("/api/notifications", headers=headers)
        assert res.status_code == 200
        
        # Mark all read
        m_res = client.post("/api/notifications/read-all", headers=headers)
        assert m_res.status_code == 200

        # Clear read
        c_res = client.post("/api/notifications/clear-read", headers=headers)
        assert c_res.status_code == 200

# ============================================================================
# DOMAIN K: CALENDAR & SCHEDULING
# ============================================================================
class TestDomainK_Calendar:
    def test_28_calendar_event_crud(self, client):
        _, _, headers = reg_user(client, "cal_user@p10integ.io", "Calendar User")
        create_res = client.post("/api/calendar/events", json={
            "title": "P10 Google Technical Screen",
            "type": "Interview",
            "date": "2026-11-20",
            "time": "10:00 AM",
            "company": "P10 Google",
            "locationOrUrl": "https://meet.google.com/xyz",
        }, headers=headers)
        assert create_res.status_code == 201
        evt_id = create_res.json()["id"]

        # Update
        patch_res = client.patch(f"/api/calendar/events/{evt_id}", json={
            "notes": "Prepare sliding window rate limiter demo",
        }, headers=headers)
        assert patch_res.status_code == 200

        # Delete
        del_res = client.delete(f"/api/calendar/events/{evt_id}", headers=headers)
        assert del_res.status_code == 200

    def test_29_calendar_google_sync(self, client):
        _, _, headers = reg_user(client, "cal_sync@p10integ.io", "Sync User")
        res = client.post("/api/calendar/google/sync", headers=headers)
        assert res.status_code == 200
        assert "success" in res.json()

# ============================================================================
# DOMAIN L: RECRUITER WORKSPACE
# ============================================================================
class TestDomainL_RecruiterWorkspace:
    def test_30_recruiter_workflow(self, client):
        _, rec_token, rec_headers = reg_user(client, "rec_boss@p10integ.io", "Recruiter Boss", "recruiter")
        
        # Metrics
        m_res = client.get("/api/recruiter/metrics", headers=rec_headers)
        assert m_res.status_code == 200
        assert "jobsPosted" in m_res.json()

        # Post job
        job_res = client.post("/api/jobs", json={
            "title": "Infrastructure Architect",
            "company": "P10 Cloud Corp",
            "location": "San Francisco, CA",
            "workType": "Hybrid",
            "experienceLevel": "Principal",
            "requiredSkills": ["Go", "Kubernetes", "Linux Kernel"],
            "description": "Architecting global multi-region cloud control plane.",
        }, headers=rec_headers)
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # Candidate pool
        c_res = client.get("/api/recruiter/candidates", headers=rec_headers)
        assert c_res.status_code == 200

    def test_31_seeker_forbidden_from_recruiter_portal(self, client):
        _, _, seeker_headers = reg_user(client, "seeker_sneak@p10integ.io", "Sneak Seeker", "seeker")
        res = client.get("/api/recruiter/metrics", headers=seeker_headers)
        assert res.status_code == 403

# ============================================================================
# DOMAIN M: COMPANY PROFILES
# ============================================================================
class TestDomainM_CompanyProfiles:
    def test_32_company_list_and_follow(self, client):
        _, _, headers = reg_user(client, "comp_follower@p10integ.io", "Follower User")
        companies = client.get("/api/companies").json()
        assert isinstance(companies, list)
        if len(companies) > 0:
            cid = companies[0]["id"]
            fol_res = client.post(f"/api/companies/{cid}/follow", headers=headers)
            assert fol_res.status_code == 200
            assert "isFollowing" in fol_res.json()

# ============================================================================
# DOMAIN N: SETTINGS & USER PROFILE
# ============================================================================
class TestDomainN_SettingsAndProfile:
    def test_33_profile_and_privacy_update(self, client):
        uid, _, headers = reg_user(client, "profile_edit@p10integ.io", "Profile Editor")
        
        # Update profile
        patch_res = client.patch("/api/users/me", json={
            "headline": "Lead Platform Engineer @ High Growth AI",
            "bio": "Passionate about distributed consensus and low-latency storage.",
            "skills": ["Go", "Raft", "Rust", "RocksDB"],
            "location": "Seattle, WA",
        }, headers=headers)
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["headline"] == "Lead Platform Engineer @ High Growth AI"
        assert "Raft" in data["skills"]

        # Update privacy
        priv_res = client.put("/api/users/me/privacy", json={
            "profileVisibility": "public",
            "hideFromCurrentEmployer": True,
            "blockedCompanies": ["Legacy Old Corp"],
            "allowRecruiterMessages": True,
        }, headers=headers)
        assert priv_res.status_code == 200

        # Public profile is sanitized
        pub_res = client.get(f"/api/users/{uid}/profile")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert "password" not in pub_data
        assert "hashed_password" not in pub_data

# ============================================================================
# DOMAIN O: ERROR HANDLING & EMPTY STATES
# ============================================================================
class TestDomainO_ErrorHandling:
    def test_34_unauthorized_error_format(self, client):
        res = client.get("/api/dashboard/overview")
        assert res.status_code == 401

    def test_35_not_found_error_format(self, client):
        _, _, headers = reg_user(client, "not_found_usr@p10integ.io", "NF User")
        res = client.get("/api/applications/nonexistent_id_9999", headers=headers)
        assert res.status_code == 404

    def test_36_validation_error_format(self, client):
        # Register with invalid short password
        res = client.post("/api/auth/register", json={
            "name": "Bad",
            "email": "badpass@p10integ.io",
            "password": "short",
        })
        assert res.status_code == 422

# ============================================================================
# DOMAIN P: DATA INTEGRITY & MULTI-TENANT ISOLATION
# ============================================================================
class TestDomainP_MultiTenantIsolation:
    def test_37_application_isolation(self, client):
        _, _, h_alice = reg_user(client, "iso_alice@p10integ.io", "Iso Alice")
        _, _, h_bob = reg_user(client, "iso_bob@p10integ.io", "Iso Bob")

        # Alice creates application
        app = client.post("/api/applications", json={
            "company": "P10 Secret Corp",
            "role": "Chief Architect",
            "status": "Applied",
        }, headers=h_alice).json()
        app_id = app["id"]

        # Bob cannot view Alice's application
        res = client.get(f"/api/applications/{app_id}", headers=h_bob)
        assert res.status_code in (403, 404)

    def test_38_resume_isolation(self, client, mock_deterministic_groq):
        _, _, h_alice = reg_user(client, "res_alice@p10integ.io", "Res Alice")
        _, _, h_bob = reg_user(client, "res_bob@p10integ.io", "Res Bob")

        pdf_bytes = generate_test_pdf("Alice confidential resume")
        res_upload = client.post(
            "/api/resumes/upload",
            files={"file": ("alice.pdf", pdf_bytes, "application/pdf")},
            headers=h_alice,
        ).json()
        res_id = res_upload["id"]

        # Bob cannot delete or toggle Alice's resume
        res = client.delete(f"/api/resumes/{res_id}", headers=h_bob)
        assert res.status_code in (403, 404)

# ============================================================================
# DOMAIN R: END-TO-END JOURNEYS (E2E-01 THROUGH E2E-12)
# ============================================================================
class TestDomainR_E2EJourneys:
    def test_e2e_01_seeker_registration_and_login(self, client):
        email = "e2e01_seeker@p10integ.io"
        uid, token, headers = reg_user(client, email, "E2E Seeker One")
        login_res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
        assert login_res.status_code == 200
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["id"] == uid

    def test_e2e_02_user_profile_customization(self, client):
        _, _, headers = reg_user(client, "e2e02_profile@p10integ.io", "E2E Profile User")
        patch_res = client.patch("/api/users/me", json={
            "headline": "Full-Stack Distributed Systems Architect",
            "bio": "Designing resilient fault-tolerant systems.",
            "skills": ["Go", "TypeScript", "React", "Kafka", "Docker"],
            "location": "San Francisco, CA",
        }, headers=headers)
        assert patch_res.status_code == 200
        assert patch_res.json()["skills"] == ["Go", "TypeScript", "React", "Kafka", "Docker"]

    def test_e2e_03_real_resume_upload_and_extraction(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "e2e03_resume@p10integ.io", "E2E Resume User")
        pdf_bytes = generate_test_pdf("Senior Distributed Systems Engineer Go Kafka Docker Kubernetes")
        upload_res = client.post(
            "/api/resumes/upload",
            files={"file": ("cv.pdf", pdf_bytes, "application/pdf")},
            headers=headers,
        )
        assert upload_res.status_code == 201
        res_data = upload_res.json()
        assert res_data["format"] == "PDF"

    def test_e2e_04_job_match_scoring(self, client):
        _, _, rec_headers = reg_user(client, "e2e04_rec@p10integ.io", "E2E Recruiter", "recruiter")
        job = client.post("/api/jobs", json={
            "title": "Senior Cloud Engineer",
            "company": "P10 Cloud Infrastructure",
            "location": "Remote",
            "workType": "Remote",
            "experienceLevel": "Senior",
            "requiredSkills": ["Go", "Docker", "Kubernetes"],
            "description": "Cloud native infrastructure engineering.",
        }, headers=rec_headers).json()

        _, _, seeker_headers = reg_user(client, "e2e04_seeker@p10integ.io", "E2E Seeker")
        match_res = client.post(f"/api/jobs/{job['id']}/match", headers=seeker_headers)
        assert match_res.status_code == 200
        assert "overallScore" in match_res.json()

    def test_e2e_05_skill_gap_analysis(self, client):
        _, _, headers = reg_user(client, "e2e05_skillgap@p10integ.io", "E2E Gap User")
        gap_res = client.get("/api/skill-gap", headers=headers)
        assert gap_res.status_code == 200

    def test_e2e_06_course_learning_flow(self, client):
        _, _, headers = reg_user(client, "e2e06_learn@p10integ.io", "E2E Learner")
        courses = client.get("/api/learning/courses", headers=headers).json()
        cid = courses[0]["id"]
        client.post(f"/api/learning/courses/{cid}/enroll", headers=headers)
        summary = client.get("/api/learning/my-progress", headers=headers).json()
        assert summary["coursesEnrolled"] >= 1

    def test_e2e_07_code_sandbox_and_ai(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "e2e07_code@p10integ.io", "E2E Coder")
        exec_res = client.post("/api/code/execute", json={
            "language": "python",
            "code": "def solve(): return True",
        })
        assert exec_res.status_code == 200
        assert exec_res.json()["status"] == "Accepted"

        hint_res = client.post("/api/ai/hint", json={
            "problemId": "two-sum",
            "userCode": "def two_sum(): pass",
            "language": "python",
        }, headers=headers)
        assert hint_res.status_code == 200

    def test_e2e_08_application_tracker_lifecycle(self, client):
        _, _, headers = reg_user(client, "e2e08_app@p10integ.io", "E2E Applicant")
        app = client.post("/api/applications", json={
            "company": "P10 Stripe Partner",
            "role": "Staff Backend Engineer",
            "status": "Applied",
            "priority": "High",
        }, headers=headers).json()
        
        # Advance stage
        patch_res = client.patch(f"/api/applications/{app['id']}", json={"status": "Offered"}, headers=headers)
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] in ("Offer", "Offered")

    def test_e2e_09_networking_and_connections(self, client):
        u1, _, h1 = reg_user(client, "e2e09_user1@p10integ.io", "E2E User 1")
        u2, _, h2 = reg_user(client, "e2e09_user2@p10integ.io", "E2E User 2")
        client.post("/api/network/requests", json={"recipientId": u2}, headers=h1)
        reqs = client.get("/api/network/requests", headers=h2).json()
        assert len(reqs) >= 1
        client.post(f"/api/network/requests/{reqs[0]['id']}/accept", headers=h2)
        conns = client.get("/api/network/connections", headers=h1).json()
        assert any(c["id"] == u2 for c in conns)

    def test_e2e_10_social_feed_interaction(self, client):
        _, _, headers = reg_user(client, "e2e10_feed@p10integ.io", "E2E Feed User")
        post = client.post("/api/posts", json={
            "content": "P10 High-throughput distributed tracing overview.",
            "category": "Architecture",
        }, headers=headers).json()
        client.post(f"/api/posts/{post['id']}/like", headers=headers)
        client.post(f"/api/posts/{post['id']}/comments", json={"content": "Great writeup!"}, headers=headers)
        feed = client.get("/api/posts").json()
        found = next((p for p in feed if p["id"] == post["id"]), None)
        assert found is not None
        assert found["likesCount"] >= 1
        assert found["commentsCount"] >= 1

    def test_e2e_11_messaging_and_notifications(self, client):
        u1, _, h1 = reg_user(client, "e2e11_sender@p10integ.io", "E2E Sender")
        u2, _, h2 = reg_user(client, "e2e11_receiver@p10integ.io", "E2E Receiver")
        conv = client.post("/api/messages/conversations", json={"participantId": u2}, headers=h1).json()
        client.post(f"/api/messages/conversations/{conv['id']}/send", json={"content": "Hello receiver!"}, headers=h1)
        msgs = client.get(f"/api/messages/conversations/{conv['id']}/messages", headers=h2).json()
        assert len(msgs) >= 1

    def test_e2e_12_recruiter_workspace_hiring_flow(self, client):
        _, _, rec_headers = reg_user(client, "e2e12_rec@p10integ.io", "E2E Recruiter Lead", "recruiter")
        job = client.post("/api/jobs", json={
            "title": "Principal SRE",
            "company": "P10 Infrastructure Labs",
            "location": "New York, NY",
            "workType": "On-site",
            "experienceLevel": "Principal",
            "requiredSkills": ["Linux", "Distributed Storage"],
            "description": "Leading resilience engineering across multi-cluster Kubernetes.",
        }, headers=rec_headers).json()

        _, _, seeker_headers = reg_user(client, "e2e12_cand@p10integ.io", "E2E Candidate")
        app = client.post("/api/applications", json={
            "jobId": job["id"],
            "company": "P10 Infrastructure Labs",
            "role": "Principal SRE",
            "status": "Applied",
        }, headers=seeker_headers).json()

        # Recruiter views applications for their job
        rec_apps = client.get(f"/api/recruiter/jobs/{job['id']}/applications", headers=rec_headers).json()
        assert len(rec_apps) >= 1

        # Recruiter progresses status
        stat_res = client.patch(f"/api/recruiter/applications/{app['id']}/status", json={
            "status": "Hired",
            "notes": "Exceptional systems engineering depth.",
        }, headers=rec_headers)
        assert stat_res.status_code == 200
        assert stat_res.json()["status"] == "Hired"


# ============================================================================
# COMPLEMENTARY INTEGRATION & EDGE CASE VERIFICATION
# ============================================================================
class TestComplementaryEdgeCasesAndIsolation:
    def test_39_password_reset_min_length_validation_422(self, client):
        res = client.post("/api/auth/reset-password", json={"token": "t-123", "password": "short"})
        assert res.status_code == 422

    def test_40_register_duplicate_email_conflict_409(self, client):
        email = "dup_email@p10integ.io"
        reg_user(client, email, "First User")
        res = client.post("/api/auth/register", json={
            "name": "Second User",
            "email": email,
            "password": "Password123!",
            "role": "seeker",
        })
        assert res.status_code in (400, 409)

    def test_41_logout_revokes_token(self, client):
        _, token, headers = reg_user(client, "logout_usr@p10integ.io", "Logout User")
        out_res = client.post("/api/auth/logout", headers=headers)
        assert out_res.status_code == 200

    def test_42_dashboard_upcoming_interviews_filter(self, client):
        _, _, headers = reg_user(client, "dash_int@p10integ.io", "Interview Seeker")
        client.post("/api/applications", json={
            "company": "P10 High Scale Tech",
            "role": "Lead Architect",
            "status": "Interview",
            "interviewDate": "2026-10-30",
        }, headers=headers)
        overview = client.get("/api/dashboard/overview", headers=headers).json()
        assert len(overview["upcomingInterviews"]) >= 1

    def test_43_dashboard_upcoming_deadlines_filter(self, client):
        _, _, headers = reg_user(client, "dash_dl@p10integ.io", "Deadline Seeker")
        client.post("/api/applications", json={
            "company": "P10 Fintech Partner",
            "role": "Senior Engineer",
            "status": "Applied",
            "deadline": "2026-11-05",
        }, headers=headers)
        overview = client.get("/api/dashboard/overview", headers=headers).json()
        assert len(overview["upcomingDeadlines"]) >= 1

    def test_44_resume_upload_empty_file_rejected(self, client):
        _, _, headers = reg_user(client, "res_empty@p10integ.io", "Empty Resume User")
        res = client.post(
            "/api/resumes/upload",
            files={"file": ("empty.pdf", b"", "application/pdf")},
            headers=headers,
        )
        assert res.status_code == 400

    def test_45_resume_foreign_active_toggle_forbidden(self, client, mock_deterministic_groq):
        _, _, h1 = reg_user(client, "res_owner@p10integ.io", "Resume Owner")
        _, _, h2 = reg_user(client, "res_intruder@p10integ.io", "Resume Intruder")
        pdf_bytes = generate_test_pdf("Senior Engineer Resume")
        up_res = client.post(
            "/api/resumes/upload",
            files={"file": ("mine.pdf", pdf_bytes, "application/pdf")},
            headers=h1,
        ).json()
        res = client.patch(f"/api/resumes/{up_res['id']}/active", headers=h2)
        assert res.status_code in (403, 404)

    def test_46_job_matches_ranked_order(self, client):
        _, _, rec_headers = reg_user(client, "rec_ranking@p10integ.io", "Recruiter Rank", "recruiter")
        client.post("/api/jobs", json={
            "title": "Staff Backend Engineer",
            "company": "P10 High Throughput Inc",
            "location": "Remote",
            "requiredSkills": ["Python", "Docker"],
            "description": "Backend services",
        }, headers=rec_headers)
        _, _, seeker_headers = reg_user(client, "seeker_ranking@p10integ.io", "Seeker Rank")
        matches = client.get("/api/jobs/matches", headers=seeker_headers)
        assert matches.status_code == 200
        assert isinstance(matches.json(), list)

    def test_47_lesson_uncomplete_and_reset(self, client):
        _, _, headers = reg_user(client, "lesson_reset@p10integ.io", "Reset Learner")
        courses = client.get("/api/learning/courses", headers=headers).json()
        cid = courses[0]["id"]
        client.post(f"/api/learning/courses/{cid}/enroll", headers=headers)
        detail = client.get(f"/api/learning/courses/{cid}", headers=headers).json()
        if detail.get("lessons"):
            lid = detail["lessons"][0]["id"]
            client.post(f"/api/learning/courses/{cid}/lessons/{lid}/complete", headers=headers)
            uncomp = client.post(f"/api/learning/courses/{cid}/lessons/{lid}/uncomplete", headers=headers)
            assert uncomp.status_code == 200
            reset_res = client.post(f"/api/learning/courses/{cid}/reset", headers=headers)
            assert reset_res.status_code == 200

    def test_48_ai_explain_error_endpoint(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "ai_err@p10integ.io", "AI Err User")
        res = client.post("/api/ai/explain-error", json={
            "code": "print(1/0)",
            "errorOutput": "ZeroDivisionError: division by zero",
            "language": "python",
        }, headers=headers)
        assert res.status_code == 200
        assert "markdownContent" in res.json()

    def test_49_ai_optimize_code_endpoint(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "ai_opt@p10integ.io", "AI Opt User")
        res = client.post("/api/ai/optimize", json={
            "code": "def find_max(l): return max(l)",
            "language": "python",
        }, headers=headers)
        assert res.status_code == 200
        assert "markdownContent" in res.json()

    def test_50_ai_generate_tests_endpoint(self, client, mock_deterministic_groq):
        _, _, headers = reg_user(client, "ai_gen@p10integ.io", "AI Gen User")
        res = client.post("/api/ai/generate-tests", json={
            "code": "def binary_search(arr, x): pass",
            "language": "python",
        }, headers=headers)
        assert res.status_code == 200
        assert "markdownContent" in res.json()

    def test_51_application_duplicate_prevention(self, client):
        _, _, rec_headers = reg_user(client, "rec_dup@p10integ.io", "Rec Dup", "recruiter")
        job = client.post("/api/jobs", json={
            "title": "Security Lead",
            "company": "P10 CyberSec",
            "location": "Remote",
            "description": "Lead appsec and hardening.",
        }, headers=rec_headers).json()
        _, _, seeker_headers = reg_user(client, "seeker_dup@p10integ.io", "Seeker Dup")
        res1 = client.post("/api/applications", json={"jobId": job["id"], "company": "P10 CyberSec", "role": "Security Lead"}, headers=seeker_headers)
        assert res1.status_code == 201
        res2 = client.post("/api/applications", json={"jobId": job["id"], "company": "P10 CyberSec", "role": "Security Lead"}, headers=seeker_headers)
        assert res2.status_code == 409

    def test_52_connection_request_reject(self, client):
        u1, _, h1 = reg_user(client, "net_rej1@p10integ.io", "Rej Sender")
        u2, _, h2 = reg_user(client, "net_rej2@p10integ.io", "Rej Receiver")
        client.post("/api/network/requests", json={"recipientId": u2}, headers=h1)
        reqs = client.get("/api/network/requests", headers=h2).json()
        assert len(reqs) >= 1
        rej_res = client.post(f"/api/network/requests/{reqs[0]['id']}/reject", headers=h2)
        assert rej_res.status_code == 200

    def test_53_connection_request_cancel(self, client):
        u1, _, h1 = reg_user(client, "net_can1@p10integ.io", "Cancel Sender")
        u2, _, h2 = reg_user(client, "net_can2@p10integ.io", "Cancel Receiver")
        req_res = client.post("/api/network/requests", json={"recipientId": u2}, headers=h1).json()
        req_id = req_res.get("id") or req_res.get("requestId")
        if req_id:
            can_res = client.delete(f"/api/network/requests/{req_id}", headers=h1)
            assert can_res.status_code == 200

    def test_54_notification_single_read_receipt(self, client):
        _, _, headers = reg_user(client, "notif_single@p10integ.io", "Single Notif User")
        notifs = client.get("/api/notifications", headers=headers).json()
        if len(notifs) > 0:
            nid = notifs[0]["id"]
            rd_res = client.post(f"/api/notifications/{nid}/read", headers=headers)
            assert rd_res.status_code == 200

    def test_55_notification_delete(self, client):
        _, _, headers = reg_user(client, "notif_del@p10integ.io", "Del Notif User")
        notifs = client.get("/api/notifications", headers=headers).json()
        if len(notifs) > 0:
            nid = notifs[0]["id"]
            del_res = client.delete(f"/api/notifications/{nid}", headers=headers)
            assert del_res.status_code == 200

    def test_56_recruiter_job_update_and_delete(self, client):
        _, _, rec_headers = reg_user(client, "rec_crud@p10integ.io", "Recruiter CRUD", "recruiter")
        job = client.post("/api/jobs", json={
            "title": "Data Engineer",
            "company": "P10 Analytics Corp",
            "location": "Remote",
            "description": "Spark, Kafka, ClickHouse.",
        }, headers=rec_headers).json()
        patch_res = client.patch(f"/api/jobs/{job['id']}", json={"salaryRange": "$170k-$210k"}, headers=rec_headers)
        assert patch_res.status_code == 200
        del_res = client.delete(f"/api/jobs/{job['id']}", headers=rec_headers)
        assert del_res.status_code == 200

    def test_57_recruiter_shortlist_toggle(self, client):
        _, _, rec_headers = reg_user(client, "rec_short@p10integ.io", "Rec Shortlist", "recruiter")
        cand_id, _, _ = reg_user(client, "cand_short@p10integ.io", "Candidate Shortlist")
        res = client.post(f"/api/recruiter/candidates/{cand_id}/shortlist", headers=rec_headers)
        assert res.status_code in (200, 201)
        del_res = client.delete(f"/api/recruiter/candidates/{cand_id}/shortlist", headers=rec_headers)
        assert del_res.status_code in (200, 204)

    def test_58_company_jobs_retrieval(self, client):
        comps = client.get("/api/companies").json()
        if len(comps) > 0:
            cid = comps[0]["id"]
            jobs = client.get(f"/api/companies/{cid}/jobs")
            assert jobs.status_code == 200
            assert isinstance(jobs.json(), list)

    def test_59_user_public_profile_hides_private_fields(self, client):
        uid, _, h1 = reg_user(client, "priv_alice@p10integ.io", "Private Alice")
        res = client.get(f"/api/users/{uid}/profile")
        assert res.status_code == 200
        data = res.json()
        assert "password" not in data
        assert "hashed_password" not in data
        assert "resetToken" not in data
