import io
import json
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from bson import ObjectId
import httpx
from pymongo import MongoClient
import pytest
import pytest_asyncio
from reportlab.pdfgen import canvas
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config import settings
from app.database import DatabaseManager
from app.main import app
from app.utils.security import create_access_token, create_refresh_token, hash_password


def generate_test_pdf(text: str = "Candidate CV Go Kafka Microservices") -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Education: BS Computer Science")
    c.drawString(72, 710, "Experience: Backend Engineer")
    c.save()
    return buffer.getvalue()


def sync_db_cleanup():
    sync_client = MongoClient(settings.MONGODB_URI)
    db = sync_client[settings.MONGODB_DB_NAME]
    db.users.delete_many({"email": {"$regex": ".*@p9sec\\.io$"}})
    db.profiles.delete_many({"userId": {"$regex": ".*p9sec.*"}})
    db.resumes.delete_many({"userId": {"$regex": ".*p9sec.*"}})
    db.resume_analyses.delete_many({"userId": {"$regex": ".*p9sec.*"}})
    db.jobs.delete_many({"company": {"$regex": ".*P9Sec.*"}})
    db.applications.delete_many({"company": {"$regex": ".*P9Sec.*"}})
    db.calendar_events.delete_many({"title": {"$regex": ".*P9Sec.*"}})
    db.conversations.delete_many({"participants": {"$regex": ".*p9sec.*"}})
    db.messages.delete_many({"senderId": {"$regex": ".*p9sec.*"}})
    db.notifications.delete_many({"userId": {"$regex": ".*p9sec.*"}})
    db.revoked_tokens.delete_many({"token": {"$regex": ".*p9sec.*"}})
    db.files.delete_many({"ownerId": {"$regex": ".*p9sec.*"}})


@pytest_asyncio.fixture(autouse=True)
async def cleanup_p9_data():
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
    while True:
        data = json.loads(ws.receive_text())
        if expected_type is None or data.get("type") == expected_type:
            return data


async def register_user(client: httpx.AsyncClient, email: str, name: str, role: str = "seeker") -> tuple[str, str, dict]:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Failed registration: {res.text}"
    data = res.json()
    token = data["access_token"]
    return data["user"]["id"], token, {"Authorization": f"Bearer {token}"}


def register_user_sync(client: TestClient, email: str, name: str, role: str = "seeker") -> tuple[str, str, dict]:
    res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Failed sync registration: {res.text}"
    data = res.json()
    token = data["access_token"]
    return data["user"]["id"], token, {"Authorization": f"Bearer {token}"}


# =========================================================================
# CATEGORY 1: AUTHENTICATION & TOKEN LIFECYCLE (12 TESTS)
# =========================================================================

@pytest.mark.asyncio
async def test_auth_missing_header_rejected_401(async_client):
    res = await async_client.get("/api/auth/me")
    assert res.status_code == 401
    assert "token required" in res.json()["detail"].lower() or "unauthorized" in res.json().get("message", "").lower()


@pytest.mark.asyncio
async def test_auth_malformed_bearer_rejected_401(async_client):
    res = await async_client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_garbage_token_format"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_invalid_token_signature_rejected_401(async_client):
    _, token, _ = await register_user(async_client, "sig@p9sec.io", "Sig User")
    tampered_token = token[:-5] + ("AAAAA" if token[-5:] != "AAAAA" else "BBBBB")
    res = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_expired_access_token_rejected_401(async_client):
    uid, _, _ = await register_user(async_client, "exp@p9sec.io", "Exp User")
    expired_token = create_access_token({"sub": uid, "user_id": uid, "role": "seeker"}, expires_delta=timedelta(minutes=-10))
    res = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_refresh_token_as_access_token_rejected_401(async_client):
    uid, _, _ = await register_user(async_client, "ref@p9sec.io", "Ref User")
    refresh_tok = create_refresh_token({"sub": uid, "user_id": uid, "role": "seeker"})
    res = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh_tok}"})
    assert res.status_code == 401
    assert "access token expected" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_revoked_token_rejected_401(async_client):
    _, token, headers = await register_user(async_client, "rev@p9sec.io", "Rev User")
    out = await async_client.post("/api/auth/logout", headers=headers)
    assert out.status_code == 200
    res = await async_client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_token_issued_prior_to_logout_rejected_401(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, token, headers = await register_user(async_client, "prevlog@p9sec.io", "Prev Log User")
    await db.users.update_one({"email": "prevlog@p9sec.io"}, {"$set": {"lastLogoutAt": int(time.time()) + 1000}})
    res = await async_client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_deactivated_user_rejected_403(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, _, headers = await register_user(async_client, "deact@p9sec.io", "Deact User")
    await db.users.update_one({"email": "deact@p9sec.io"}, {"$set": {"isActive": False}})
    res = await async_client.get("/api/auth/me", headers=headers)
    assert res.status_code == 403
    assert "deactivated" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_deleted_user_token_rejected_401(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, _, headers = await register_user(async_client, "delusr@p9sec.io", "Del User")
    await db.users.delete_one({"email": "delusr@p9sec.io"})
    res = await async_client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_backdoor_token_demo_rejected_400(async_client):
    await register_user(async_client, "victim@p9sec.io", "Victim Seeker")
    res1 = await async_client.post("/api/auth/reset-password", json={
        "token": "mock_token_demo",
        "password": "AttackerPassword123!",
    })
    assert res1.status_code == 400

    res2 = await async_client.post("/api/auth/reset-password", json={
        "token": "mock-token-demo",
        "password": "AttackerPassword123!",
    })
    assert res2.status_code == 400


@pytest.mark.asyncio
async def test_auth_expired_password_reset_token_rejected_400(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, _, _ = await register_user(async_client, "expired_reset@p9sec.io", "Expired Reset User")
    expired_ts = int(time.time()) - 100
    await db.users.update_one({"email": "expired_reset@p9sec.io"}, {"$set": {"resetToken": "tok_expired_12345", "resetTokenExpiresAt": expired_ts}})
    res = await async_client.post("/api/auth/reset-password", json={
        "token": "tok_expired_12345",
        "password": "NewValidPassword123!",
    })
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_auth_valid_cryptographic_reset_token_and_single_use(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, _, _ = await register_user(async_client, "crypto_reset@p9sec.io", "Crypto Reset User")
    forgot = await async_client.post("/api/auth/forgot-password", json={"email": "crypto_reset@p9sec.io"})
    assert forgot.status_code == 200

    user_doc = await db.users.find_one({"email": "crypto_reset@p9sec.io"})
    assert user_doc is not None
    reset_tok = user_doc.get("resetToken")
    assert reset_tok is not None
    assert reset_tok.startswith("tok_")
    assert len(reset_tok) >= 32

    # Reset password successfully
    res = await async_client.post("/api/auth/reset-password", json={
        "token": reset_tok,
        "password": "BrandNewPassword123!",
    })
    assert res.status_code == 200

    # Single-use: using same token again must fail (400)
    reuse = await async_client.post("/api/auth/reset-password", json={
        "token": reset_tok,
        "password": "AnotherNewPassword123!",
    })
    assert reuse.status_code == 400


# =========================================================================
# CATEGORY 2: RBAC & PRIVILEGE ESCALATION (10 TESTS)
# =========================================================================

@pytest.mark.asyncio
async def test_rbac_seeker_cannot_post_job_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.jobpost@p9sec.io", "Seeker User")
    res = await async_client.post("/api/jobs", json={
        "title": "Software Engineer",
        "company": "P9Sec Tech",
        "location": "Remote",
        "description": "Develop high throughput backend services.",
    }, headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_update_job_403(async_client):
    _, _, rec_headers = await register_user(async_client, "rec.job@p9sec.io", "Recruiter User", role="recruiter")
    _, _, seeker_headers = await register_user(async_client, "seeker.jobpatch@p9sec.io", "Seeker User")
    job_res = await async_client.post("/api/jobs", json={
        "title": "Backend Engineer",
        "company": "P9Sec Tech",
        "location": "Remote",
        "description": "Building microservices in Go.",
    }, headers=rec_headers)
    job_id = job_res.json()["id"]

    res = await async_client.patch(f"/api/jobs/{job_id}", json={"title": "Hacked Title"}, headers=seeker_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_delete_job_403(async_client):
    _, _, rec_headers = await register_user(async_client, "rec.deljob@p9sec.io", "Recruiter User", role="recruiter")
    _, _, seeker_headers = await register_user(async_client, "seeker.deljob@p9sec.io", "Seeker User")
    job_res = await async_client.post("/api/jobs", json={
        "title": "DevOps Engineer",
        "company": "P9Sec Tech",
        "location": "Remote",
        "description": "Kubernetes platform engineering.",
    }, headers=rec_headers)
    job_id = job_res.json()["id"]

    res = await async_client.delete(f"/api/jobs/{job_id}", headers=seeker_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_access_recruiter_applications_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.recapps@p9sec.io", "Seeker User")
    res = await async_client.get("/api/recruiter/applications", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_access_recruiter_metrics_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.recmetrics@p9sec.io", "Seeker User")
    res = await async_client.get("/api/recruiter/metrics", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_access_recruiter_candidates_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.cands@p9sec.io", "Seeker User")
    res = await async_client.get("/api/recruiter/candidates", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_update_application_stage_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.appstage@p9sec.io", "Seeker User")
    res = await async_client.patch("/api/recruiter/applications/app_dummy_123/status", json={
        "status": "Offer",
    }, headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_download_applicant_resume_403(async_client):
    _, _, headers = await register_user(async_client, "seeker.appres@p9sec.io", "Seeker User")
    res = await async_client.get("/api/recruiter/applications/app_dummy_123/resume", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_escalate_to_admin_via_registration(async_client):
    with patch("app.config.settings.ENVIRONMENT", "production"):
        res = await async_client.post("/api/auth/register", json={
            "name": "Attacker Admin",
            "email": "attacker.admin@p9sec.io",
            "password": "Password123!",
            "role": "admin",
        })
        assert res.status_code == 403
        assert "cannot be self-registered" in res.json()["message"].lower()


@pytest.mark.asyncio
async def test_rbac_seeker_cannot_escalate_role_via_profile_patch(async_client):
    db = DatabaseManager.db
    assert db is not None
    uid, _, headers = await register_user(async_client, "seeker.escrole@p9sec.io", "Seeker Esc")
    res = await async_client.patch("/api/users/me", json={"role": "admin"}, headers=headers)
    assert res.status_code == 200
    user_doc = await db.users.find_one({"email": "seeker.escrole@p9sec.io"})
    assert user_doc["role"] == "seeker"


# =========================================================================
# CATEGORY 3: MULTI-TENANT DATA ISOLATION & IDOR (18 TESTS)
# =========================================================================

@pytest.mark.asyncio
async def test_idor_resume_cross_tenant_analyze_403(async_client, mock_deterministic_groq):
    _, _, headers_a = await register_user(async_client, "alice.res@p9sec.io", "Alice Res")
    _, _, headers_b = await register_user(async_client, "bob.res@p9sec.io", "Bob Res")

    pdf_bytes = generate_test_pdf("Bob Private Resume")
    up = await async_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_CV.pdf", pdf_bytes, "application/pdf")},
        headers=headers_b,
    )
    assert up.status_code == 201
    bob_res_id = up.json()["id"]

    res = await async_client.post(
        f"/api/resumes/{bob_res_id}/analyze",
        json={"jobDescription": "Engineering lead role"},
        headers=headers_a,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_resume_cross_tenant_read_analysis_403(async_client, mock_deterministic_groq):
    _, _, headers_a = await register_user(async_client, "alice.ran@p9sec.io", "Alice Ran")
    _, _, headers_b = await register_user(async_client, "bob.ran@p9sec.io", "Bob Ran")

    pdf_bytes = generate_test_pdf("Bob Analysis Resume")
    up = await async_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_An.pdf", pdf_bytes, "application/pdf")},
        headers=headers_b,
    )
    bob_res_id = up.json()["id"]

    await async_client.post(f"/api/resumes/{bob_res_id}/analyze", headers=headers_b)
    res = await async_client.get(f"/api/resumes/{bob_res_id}/analysis", headers=headers_a)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_resume_cross_tenant_delete_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.rdel@p9sec.io", "Alice RDel")
    _, _, headers_b = await register_user(async_client, "bob.rdel@p9sec.io", "Bob RDel")

    pdf_bytes = generate_test_pdf("Bob Delete Resume")
    up = await async_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Del.pdf", pdf_bytes, "application/pdf")},
        headers=headers_b,
    )
    bob_res_id = up.json()["id"]

    res = await async_client.delete(f"/api/resumes/{bob_res_id}", headers=headers_a)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_resume_cross_tenant_activate_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.ract@p9sec.io", "Alice RAct")
    _, _, headers_b = await register_user(async_client, "bob.ract@p9sec.io", "Bob RAct")

    pdf_bytes = generate_test_pdf("Bob Toggle Active")
    up = await async_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Act.pdf", pdf_bytes, "application/pdf")},
        headers=headers_b,
    )
    bob_res_id = up.json()["id"]

    res = await async_client.patch(f"/api/resumes/{bob_res_id}/active", headers=headers_a)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_file_unrelated_recruiter_resume_download_403(async_client):
    _, _, headers_alice = await register_user(async_client, "alice.privfile@p9sec.io", "Alice Cand")
    _, _, headers_eve = await register_user(async_client, "eve.privfile@p9sec.io", "Eve Recruiter", role="recruiter")

    pdf_bytes = generate_test_pdf("Alice Private Resume File")
    up = await async_client.post(
        "/api/files/upload",
        files={"file": ("Alice_Resume.pdf", pdf_bytes, "application/pdf")},
        data={"purpose": "resume"},
        headers=headers_alice,
    )
    assert up.status_code == 201
    file_id = up.json()["id"]

    res = await async_client.get(f"/api/files/{file_id}", headers=headers_eve)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_file_recruiter_valid_applicant_resume_download_200(async_client):
    uid_alice, _, headers_alice = await register_user(async_client, "alice.appfile@p9sec.io", "Alice Cand")
    _, _, headers_sarah = await register_user(async_client, "sarah.appfile@p9sec.io", "Sarah Recruiter", role="recruiter")

    job_res = await async_client.post("/api/jobs", json={
        "title": "Platform Lead",
        "company": "P9Sec Sarah Inc",
        "location": "Remote",
        "description": "Leading global platform engineering team.",
    }, headers=headers_sarah)
    job_id = job_res.json()["id"]

    pdf_bytes = generate_test_pdf("Alice Valid Applied Resume")
    up = await async_client.post(
        "/api/files/upload",
        files={"file": ("Alice_Applied.pdf", pdf_bytes, "application/pdf")},
        data={"purpose": "resume"},
        headers=headers_alice,
    )
    file_id = up.json()["id"]

    await async_client.post("/api/applications", json={
        "jobId": job_id,
        "company": "P9Sec Sarah Inc",
        "role": "Platform Lead",
        "status": "Applied",
        "resumeId": file_id,
    }, headers=headers_alice)

    res = await async_client.get(f"/api/files/{file_id}", headers=headers_sarah)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_idor_file_cross_tenant_delete_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.fdel@p9sec.io", "Alice FDel")
    _, _, headers_b = await register_user(async_client, "bob.fdel@p9sec.io", "Bob FDel")

    pdf_bytes = generate_test_pdf("Alice Private Document")
    up = await async_client.post(
        "/api/files/upload",
        files={"file": ("Alice_Doc.pdf", pdf_bytes, "application/pdf")},
        data={"purpose": "other"},
        headers=headers_a,
    )
    file_id = up.json()["id"]

    res = await async_client.delete(f"/api/files/{file_id}", headers=headers_b)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_application_cross_tenant_view_404(async_client):
    _, _, headers_a = await register_user(async_client, "alice.appv@p9sec.io", "Alice AppV")
    _, _, headers_b = await register_user(async_client, "bob.appv@p9sec.io", "Bob AppV")

    created = await async_client.post("/api/applications", json={
        "company": "P9Sec Target",
        "role": "Lead Engineer",
        "status": "Applied",
    }, headers=headers_a)
    app_id = created.json()["id"]

    res = await async_client.get(f"/api/applications/{app_id}", headers=headers_b)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_application_cross_tenant_update_404(async_client):
    _, _, headers_a = await register_user(async_client, "alice.appu@p9sec.io", "Alice AppU")
    _, _, headers_b = await register_user(async_client, "bob.appu@p9sec.io", "Bob AppU")

    created = await async_client.post("/api/applications", json={
        "company": "P9Sec Target",
        "role": "Lead Engineer",
        "status": "Applied",
    }, headers=headers_a)
    app_id = created.json()["id"]

    res = await async_client.patch(f"/api/applications/{app_id}", json={"status": "Rejected"}, headers=headers_b)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_application_cross_tenant_delete_404(async_client):
    _, _, headers_a = await register_user(async_client, "alice.appd@p9sec.io", "Alice AppD")
    _, _, headers_b = await register_user(async_client, "bob.appd@p9sec.io", "Bob AppD")

    created = await async_client.post("/api/applications", json={
        "company": "P9Sec Target",
        "role": "Lead Engineer",
        "status": "Applied",
    }, headers=headers_a)
    app_id = created.json()["id"]

    res = await async_client.delete(f"/api/applications/{app_id}", headers=headers_b)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_job_cross_tenant_update_by_other_recruiter_403(async_client):
    _, _, headers_sarah = await register_user(async_client, "sarah.jobup@p9sec.io", "Sarah Recruiter", role="recruiter")
    _, _, headers_eve = await register_user(async_client, "eve.jobup@p9sec.io", "Eve Recruiter", role="recruiter")

    job_res = await async_client.post("/api/jobs", json={
        "title": "Sarah Job",
        "company": "P9Sec Sarah",
        "location": "Remote",
        "description": "Sarah private engineering role.",
    }, headers=headers_sarah)
    job_id = job_res.json()["id"]

    res = await async_client.patch(f"/api/jobs/{job_id}", json={"title": "Eve Modified"}, headers=headers_eve)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_job_cross_tenant_delete_by_other_recruiter_403(async_client):
    _, _, headers_sarah = await register_user(async_client, "sarah.jobdel@p9sec.io", "Sarah Recruiter", role="recruiter")
    _, _, headers_eve = await register_user(async_client, "eve.jobdel@p9sec.io", "Eve Recruiter", role="recruiter")

    job_res = await async_client.post("/api/jobs", json={
        "title": "Sarah Job To Delete",
        "company": "P9Sec Sarah",
        "location": "Remote",
        "description": "Sarah role to be purged.",
    }, headers=headers_sarah)
    job_id = job_res.json()["id"]

    res = await async_client.delete(f"/api/jobs/{job_id}", headers=headers_eve)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_calendar_cross_tenant_view_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.calv@p9sec.io", "Alice CalV")
    _, _, headers_b = await register_user(async_client, "bob.calv@p9sec.io", "Bob CalV")

    event_res = await async_client.post("/api/calendar/events", json={
        "title": "P9Sec Interview With Alice",
        "date": "2026-09-15",
        "time": "10:00 AM",
        "type": "Interview",
    }, headers=headers_a)
    event_id = event_res.json()["id"]

    res = await async_client.get(f"/api/calendar/events/{event_id}", headers=headers_b)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_calendar_cross_tenant_update_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.calu@p9sec.io", "Alice CalU")
    _, _, headers_b = await register_user(async_client, "bob.calu@p9sec.io", "Bob CalU")

    event_res = await async_client.post("/api/calendar/events", json={
        "title": "P9Sec Alice Event",
        "date": "2026-09-15",
        "time": "10:00 AM",
        "type": "Interview",
    }, headers=headers_a)
    event_id = event_res.json()["id"]

    res = await async_client.patch(f"/api/calendar/events/{event_id}", json={"title": "Hacked"}, headers=headers_b)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_calendar_cross_tenant_delete_403(async_client):
    _, _, headers_a = await register_user(async_client, "alice.cald@p9sec.io", "Alice CalD")
    _, _, headers_b = await register_user(async_client, "bob.cald@p9sec.io", "Bob CalD")

    event_res = await async_client.post("/api/calendar/events", json={
        "title": "P9Sec Alice Event To Delete",
        "date": "2026-09-15",
        "time": "10:00 AM",
        "type": "Interview",
    }, headers=headers_a)
    event_id = event_res.json()["id"]

    res = await async_client.delete(f"/api/calendar/events/{event_id}", headers=headers_b)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_chat_cross_tenant_outsider_cannot_read_messages_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.chatread@p9sec.io", "Alice Chat")
    uid_b, _, _ = await register_user(async_client, "bob.chatread@p9sec.io", "Bob Chat")
    _, _, headers_eve = await register_user(async_client, "eve.chatread@p9sec.io", "Eve Chat")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.get(f"/api/messages/conversations/{conv_id}/messages", headers=headers_eve)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_chat_cross_tenant_outsider_cannot_send_message_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.chatsend@p9sec.io", "Alice Chat")
    uid_b, _, _ = await register_user(async_client, "bob.chatsend@p9sec.io", "Bob Chat")
    _, _, headers_eve = await register_user(async_client, "eve.chatsend@p9sec.io", "Eve Chat")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    res = await async_client.post(f"/api/messages/conversations/{conv_id}/send", json={"content": "Intrusion"}, headers=headers_eve)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_idor_chat_cross_tenant_non_author_cannot_edit_message_403(async_client):
    uid_a, _, headers_a = await register_user(async_client, "alice.chatedit@p9sec.io", "Alice Chat")
    uid_b, _, headers_b = await register_user(async_client, "bob.chatedit@p9sec.io", "Bob Chat")

    conv_res = await async_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    send_res = await async_client.post(f"/api/messages/conversations/{conv_id}/send", json={"content": "Alice Text"}, headers=headers_a)
    msg_id = send_res.json()["id"]

    res = await async_client.patch(f"/api/messages/conversations/{conv_id}/messages/{msg_id}", json={"content": "Bob Tampered"}, headers=headers_b)
    assert res.status_code == 403


# =========================================================================
# CATEGORY 4: FILE UPLOAD & PATH TRAVERSAL SECURITY (8 TESTS)
# =========================================================================

@pytest.mark.asyncio
async def test_file_executable_py_rejected_400(async_client):
    _, _, headers = await register_user(async_client, "alice.pyup@p9sec.io", "Alice Py")
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("malicious.py", b"import os; os.system('calc')", "text/x-python")},
        headers=headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_file_executable_exe_rejected_400(async_client):
    _, _, headers = await register_user(async_client, "alice.exeup@p9sec.io", "Alice Exe")
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("malicious.exe", b"MZ\x90\x00\x03binarydata", "application/x-msdownload")},
        headers=headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_file_executable_sh_rejected_400(async_client):
    _, _, headers = await register_user(async_client, "alice.shup@p9sec.io", "Alice Sh")
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("script.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh")},
        headers=headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_file_mime_mismatch_pdf_header_tampered_400(async_client):
    _, _, headers = await register_user(async_client, "alice.mimemm@p9sec.io", "Alice Mime")
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("fake.pdf", b"NOT_A_PDF_CONTENT_HERE", "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 400
    assert "signature mismatch" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_file_path_traversal_filename_sanitized(async_client):
    _, _, headers = await register_user(async_client, "alice.pathtr@p9sec.io", "Alice PathTr")
    pdf_bytes = generate_test_pdf("Path Traversal Test")
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("../../../../etc/passwd.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 201
    meta = res.json()
    assert "/" not in meta["originalFilename"]
    assert ".." not in meta["originalFilename"]
    assert "\\" not in meta["originalFilename"]


@pytest.mark.asyncio
async def test_file_empty_upload_rejected_400(async_client):
    _, _, headers = await register_user(async_client, "alice.emptyf@p9sec.io", "Alice Empty")
    res = await async_client.post(
        "/api/resumes/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_file_oversized_upload_rejected_413(async_client):
    _, _, headers = await register_user(async_client, "alice.oversize@p9sec.io", "Alice Oversize")
    huge_pdf = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    res = await async_client.post(
        "/api/files/upload",
        files={"file": ("huge.pdf", huge_pdf, "application/pdf")},
        headers=headers,
    )
    assert res.status_code == 413


@pytest.mark.asyncio
async def test_file_unauthenticated_private_resume_download_rejected_401(async_client):
    _, _, headers = await register_user(async_client, "alice.noauthdl@p9sec.io", "Alice NoAuth")
    pdf_bytes = generate_test_pdf("Private Content")
    up = await async_client.post(
        "/api/files/upload",
        files={"file": ("Private.pdf", pdf_bytes, "application/pdf")},
        data={"purpose": "resume"},
        headers=headers,
    )
    file_id = up.json()["id"]

    res = await async_client.get(f"/api/files/{file_id}")
    assert res.status_code == 401


# =========================================================================
# CATEGORY 5: WEBSOCKET SECURITY & FRAMING (6 TESTS)
# =========================================================================

def test_ws_unauthenticated_connection_rejected_1008(ws_client):
    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect("/api/ws/chat"):
            pass
    assert exc.value.code == 1008


def test_ws_invalid_token_connection_rejected_1008(ws_client):
    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect("/api/ws/chat?token=garbage_invalid_token"):
            pass
    assert exc.value.code == 1008


def test_ws_revoked_token_connection_rejected_1008(ws_client):
    _, token, headers = register_user_sync(ws_client, "ws.revoked@p9sec.io", "WS Revoked")
    ws_client.post("/api/auth/logout", headers=headers)

    with pytest.raises(WebSocketDisconnect) as exc:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token}"):
            pass
    assert exc.value.code == 1008


def test_ws_outsider_send_message_rejected_error(ws_client):
    uid_a, token_a, headers_a = register_user_sync(ws_client, "alice.wsout@p9sec.io", "Alice WSOut")
    uid_b, token_b, _ = register_user_sync(ws_client, "bob.wsout@p9sec.io", "Bob WSOut")
    _, token_c, _ = register_user_sync(ws_client, "charlie.wsout@p9sec.io", "Charlie WSOut")

    conv_res = ws_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_c}") as ws_c:
        ws_c.send_text(json.dumps({
            "type": "message",
            "payload": {
                "conversationId": conv_id,
                "content": "Intrusion message from outsider",
            },
        }))
        reply = receive_envelope(ws_c, expected_type="error")
        assert reply["type"] == "error"
        assert "unauthorized" in reply["payload"]["message"].lower()


def test_ws_payload_oversize_64kb_rejected(ws_client):
    _, token, _ = register_user_sync(ws_client, "alice.wsover@p9sec.io", "Alice WSOver")
    with ws_client.websocket_connect(f"/api/ws/chat?token={token}") as ws:
        huge_payload = "A" * 70000
        ws.send_text(huge_payload)
        reply = receive_envelope(ws, expected_type="error")
        assert reply["type"] == "error"
        assert "exceeds maximum allowed limit" in reply["payload"]["message"].lower()


def test_ws_sender_id_spoofing_ignored_authoritative_jwt(ws_client):
    uid_a, token_a, headers_a = register_user_sync(ws_client, "alice.spoof@p9sec.io", "Alice Spoof")
    uid_b, token_b, _ = register_user_sync(ws_client, "bob.spoof@p9sec.io", "Bob Spoof")

    conv_res = ws_client.post("/api/messages/conversations", json={"participantId": uid_b}, headers=headers_a)
    conv_id = conv_res.json()["id"]

    with ws_client.websocket_connect(f"/api/ws/chat?token={token_b}") as ws_b:
        with ws_client.websocket_connect(f"/api/ws/chat?token={token_a}") as ws_a:
            # Alice tries to claim senderId is Bob
            ws_a.send_text(json.dumps({
                "type": "message",
                "payload": {
                    "conversationId": conv_id,
                    "senderId": uid_b,
                    "content": "I am pretending to be Bob",
                },
            }))

            received = receive_envelope(ws_b, expected_type="message")
            # Authoritative server JWT check: senderId must still be Alice
            assert received["payload"]["senderId"] == uid_a


# =========================================================================
# CATEGORY 6: TRANSPORT, HEADERS, PRIVACY & INJECTION DEFENSES (7 TESTS)
# =========================================================================

@pytest.mark.asyncio
async def test_security_headers_present_on_all_responses(async_client):
    res = await async_client.get("/")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in headers.get("permissions-policy", "")


def test_cors_origins_prevent_wildcard_with_credentials():
    with patch.object(settings, "CORS_ORIGINS", "*,http://localhost:3000"):
        origins = settings.cors_origins_list
        assert "*" not in origins
        assert "http://localhost:3000" in origins


@pytest.mark.asyncio
async def test_regex_injection_in_search_query_safe(async_client):
    _, _, headers = await register_user(async_client, "alice.search@p9sec.io", "Alice Search")
    res = await async_client.get("/api/search?q=.*+()^$|", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "results" in data


@pytest.mark.asyncio
async def test_nosql_special_characters_in_id_lookup_safe(async_client):
    _, _, headers = await register_user(async_client, "alice.idlook@p9sec.io", "Alice Look")
    res = await async_client.get("/api/applications/{$gt:''}", headers=headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_user_profile_masks_private_email_for_unauthenticated(async_client):
    uid, _, _ = await register_user(async_client, "alice.privview@p9sec.io", "Alice PrivView")
    res = await async_client.get(f"/api/users/{uid}")
    assert res.status_code == 200
    data = res.json()
    assert "alice.privview@p9sec.io" not in data["email"]
    assert "***@" in data["email"]
    assert data["atsScore"] is None


@pytest.mark.asyncio
async def test_unhandled_exception_does_not_leak_stacktrace(async_client):
    res = await async_client.get("/api/users/invalid_id_not_found_test")
    assert res.status_code == 404
    data = res.json()
    assert "traceback" not in str(data).lower()
    assert "exception" not in str(data).lower()


@pytest.mark.asyncio
async def test_production_forgot_password_does_not_leak_token(async_client):
    await register_user(async_client, "alice.prodfpwd@p9sec.io", "Alice ProdFPwd")
    with patch("app.config.settings.ENVIRONMENT", "production"):
        res = await async_client.post("/api/auth/forgot-password", json={"email": "alice.prodfpwd@p9sec.io"})
        assert res.status_code == 200
        msg = res.json()["message"]
        assert "token for local testing:" not in msg.lower()
        assert "tok_" not in msg
