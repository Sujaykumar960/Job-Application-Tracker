import io
import json
from unittest.mock import AsyncMock, patch
import httpx
import pytest
import pytest_asyncio
from reportlab.pdfgen import canvas

from app.config import settings
from app.database import DatabaseManager
from app.main import app
from app.schemas.resume import ResumeAnalysisResult
from app.storage import get_storage_backend


def generate_test_pdf_bytes(text: str = "Elena Rostova Distributed Systems Engineer. Skills: Go, Kafka, Redis, Docker, Microservices.") -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Education: BS Computer Science, University of Washington, 2024")
    c.drawString(72, 710, "Experience: Built high throughput distributed rate limiter processing 10k req/sec.")
    c.save()
    return buffer.getvalue()


@pytest_asyncio.fixture
async def privacy_client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@privtest\\.io$"}})
        await db.resumes.delete_many({"userId": {"$regex": "^usr_priv_.*"}})
        await db.resume_analyses.delete_many({"userId": {"$regex": "^usr_priv_.*"}})
        await db.jobs.delete_many({"company": {"$regex": ".*Priv.*"}})
        await db.applications.delete_many({"company": {"$regex": ".*Priv.*"}})


async def register_user(client: httpx.AsyncClient, email: str, name: str, role: str = "seeker") -> tuple[str, str]:
    res = await client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "Password123!", "role": role},
    )
    assert res.status_code == 201, f"Failed registration: {res.text}"
    data = res.json()
    return data["user"]["id"], data["access_token"]


@pytest.mark.asyncio
async def test_user_cannot_trigger_analysis_on_foreign_resume(privacy_client, mock_deterministic_groq):
    """Alice can trigger analysis on her own resume; Alice cannot trigger analysis on Bob's resume (403 Forbidden)."""
    uid_a, token_a = await register_user(privacy_client, "alice@privtest.io", "Alice Seeker")
    uid_b, token_b = await register_user(privacy_client, "bob@privtest.io", "Bob Seeker")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice uploads her resume
    pdf_a = generate_test_pdf_bytes("Alice Engineer Go Kubernetes Kafka Microservices")
    res_a = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Alice_Resume.pdf", pdf_a, "application/pdf")},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    # Bob uploads his resume
    pdf_b = generate_test_pdf_bytes("Bob Engineer Python FastAPI PostgreSQL Distributed Systems")
    res_b = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Resume.pdf", pdf_b, "application/pdf")},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    # 1. Alice's legitimate analysis succeeds (exercises entire pipeline deterministically)
    alice_analysis = await privacy_client.post(
        f"/api/resumes/{id_a}/analyze",
        json={"jobDescription": "Looking for Go and Kubernetes engineer."},
        headers=headers_a,
    )
    assert alice_analysis.status_code == 200, f"Alice analysis failed: {alice_analysis.text}"
    data = alice_analysis.json()
    assert data["atsScore"] == 88
    assert data["userId"] == uid_a
    assert data["resumeId"] == id_a

    # 2. Alice attempts to trigger analysis on Bob's resume -> 403 Forbidden
    hack_analysis = await privacy_client.post(
        f"/api/resumes/{id_b}/analyze",
        json={"jobDescription": "Malicious probe"},
        headers=headers_a,
    )
    assert hack_analysis.status_code == 403, f"Expected 403, got {hack_analysis.status_code}"
    assert "permission" in hack_analysis.json()["detail"].lower() or "forbidden" in hack_analysis.json()["detail"].lower()


@pytest.mark.asyncio
async def test_resume_deletion_cascade_isolation(privacy_client, mock_deterministic_groq):
    """Deleting Alice's resume removes Alice's resume and analyses, while Bob's resume and analysis remain untouched."""
    uid_a, token_a = await register_user(privacy_client, "alice.del@privtest.io", "Alice Del")
    uid_b, token_b = await register_user(privacy_client, "bob.del@privtest.io", "Bob Del")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Upload and analyze Alice's resume
    pdf_a = generate_test_pdf_bytes("Alice Cascade Test Go Redis Docker")
    res_a = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Alice_Cascade.pdf", pdf_a, "application/pdf")},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    analyze_a = await privacy_client.post(f"/api/resumes/{id_a}/analyze", headers=headers_a)
    assert analyze_a.status_code == 200

    # Upload and analyze Bob's resume
    pdf_b = generate_test_pdf_bytes("Bob Cascade Test Python FastAPI PostgreSQL")
    res_b = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Cascade.pdf", pdf_b, "application/pdf")},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    analyze_b = await privacy_client.post(f"/api/resumes/{id_b}/analyze", headers=headers_b)
    assert analyze_b.status_code == 200

    db = DatabaseManager.db
    assert db is not None

    # Verify both analyses exist in DB
    assert await db.resume_analyses.find_one({"resumeId": id_a}) is not None
    assert await db.resume_analyses.find_one({"resumeId": id_b}) is not None

    # Alice deletes her resume
    del_res = await privacy_client.delete(f"/api/resumes/{id_a}", headers=headers_a)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify Alice's resume and analyses are wiped
    assert await db.resumes.find_one({"id": id_a}) is None
    assert await db.resume_analyses.find_one({"resumeId": id_a}) is None

    # Verify Bob's resume and analysis are completely untouched
    bob_resume = await db.resumes.find_one({"id": id_b})
    assert bob_resume is not None
    assert bob_resume["userId"] == uid_b

    bob_analysis = await db.resume_analyses.find_one({"resumeId": id_b})
    assert bob_analysis is not None
    assert bob_analysis["userId"] == uid_b


@pytest.mark.asyncio
async def test_groq_analysis_isolation_and_all_fields_populated(privacy_client, mock_deterministic_groq):
    """Bob's analysis succeeds with all 18 fields populated; Alice cannot read Bob's analysis (403)."""
    uid_a, token_a = await register_user(privacy_client, "alice.view@privtest.io", "Alice Viewer")
    uid_b, token_b = await register_user(privacy_client, "bob.view@privtest.io", "Bob Owner")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Bob uploads and analyzes resume
    pdf_b = generate_test_pdf_bytes("Bob Architect Distributed Systems Kafka Go Redis")
    res_b = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Dossier.pdf", pdf_b, "application/pdf")},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    analyze_b = await privacy_client.post(
        f"/api/resumes/{id_b}/analyze",
        json={"jobDescription": "Staff Infrastructure Engineer with Go, Kafka, Redis"},
        headers=headers_b,
    )
    assert analyze_b.status_code == 200
    data = analyze_b.json()

    # 13. Verify all 18 required schema fields are populated in response
    required_fields = [
        "userId",
        "resumeId",
        "atsScore",
        "percentile",
        "targetProfile",
        "targetRole",
        "keywords",
        "hardSkills",
        "pillars",
        "strengths",
        "weaknesses",
        "optimizationAreas",
        "extractedSkills",
        "bulletImprovements",
        "experienceRewrites",
        "projects",
        "education",
        "formattingRecommendations",
    ]
    for field in required_fields:
        assert field in data, f"Field '{field}' missing from analysis response"
        assert data[field] is not None, f"Field '{field}' is None in response"

    # Verify values in MongoDB record
    db = DatabaseManager.db
    db_record = await db.resume_analyses.find_one({"resumeId": id_b})
    assert db_record is not None
    for field in required_fields:
        assert field in db_record, f"Field '{field}' missing from persisted MongoDB record"

    # 14. Strict multi-tenant isolation assertions:
    # Alice CANNOT read Bob's analysis
    alice_read = await privacy_client.get(f"/api/resumes/{id_b}/analysis", headers=headers_a)
    assert alice_read.status_code == 403

    # Alice CANNOT delete Bob's resume
    alice_delete = await privacy_client.delete(f"/api/resumes/{id_b}", headers=headers_a)
    assert alice_delete.status_code == 403

    # Alice CANNOT activate Bob's resume
    alice_active = await privacy_client.patch(f"/api/resumes/{id_b}/active", headers=headers_a)
    assert alice_active.status_code == 403


@pytest.mark.asyncio
async def test_recruiter_resume_privacy_boundary(privacy_client, mock_deterministic_groq):
    """Job-owning recruiter can access applicant resume; non-job recruiter receives 403 Forbidden."""
    # 1. Register Seeker Alice
    uid_alice, token_alice = await register_user(privacy_client, "alice.cand@privtest.io", "Alice Candidate", role="seeker")
    # 2. Register Recruiter Sarah (owns job)
    uid_sarah, token_sarah = await register_user(privacy_client, "sarah.rec@privtest.io", "Sarah Recruiter", role="recruiter")
    # 3. Register Recruiter Eve (competitor, does not own job)
    uid_eve, token_eve = await register_user(privacy_client, "eve.rec@privtest.io", "Eve Recruiter", role="recruiter")

    headers_alice = {"Authorization": f"Bearer {token_alice}"}
    headers_sarah = {"Authorization": f"Bearer {token_sarah}"}
    headers_eve = {"Authorization": f"Bearer {token_eve}"}

    # Sarah posts an active engineering role
    job_res = await privacy_client.post(
        "/api/jobs",
        json={
            "title": "Priv Staff Engineer",
            "company": "PrivTech",
            "location": "Remote",
            "description": "Building high-performance distributed systems in Go.",
            "skills": ["Go", "Kafka"],
        },
        headers=headers_sarah,
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Alice uploads her resume
    pdf_bytes = generate_test_pdf_bytes("Alice Private Resume Content")
    res_upload = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Alice_Private.pdf", pdf_bytes, "application/pdf")},
        headers=headers_alice,
    )
    assert res_upload.status_code == 201
    resume_id = res_upload.json()["id"]

    # Alice applies to Sarah's job
    app_res = await privacy_client.post(
        "/api/applications",
        json={
            "jobId": job_id,
            "company": "PrivTech",
            "role": "Priv Staff Engineer",
            "location": "Remote",
            "appliedDate": "2026-09-06",
            "status": "Applied",
            "resumeId": resume_id,
            "resume": "Alice_Private.pdf",
        },
        headers=headers_alice,
    )
    assert app_res.status_code == 201
    application_id = app_res.json()["id"]

    # Sarah (owner of job) downloads Alice's resume -> 200 OK
    sarah_download = await privacy_client.get(
        f"/api/recruiter/applications/{application_id}/resume",
        headers=headers_sarah,
    )
    assert sarah_download.status_code == 200
    assert sarah_download.headers["content-type"] == "application/pdf"

    # Eve (unrelated recruiter) CANNOT download Alice's resume -> 403 Forbidden
    eve_download = await privacy_client.get(
        f"/api/recruiter/applications/{application_id}/resume",
        headers=headers_eve,
    )
    assert eve_download.status_code == 403

    # Seeker Alice accessing recruiter download endpoint is 403 Forbidden (requires recruiter/admin role)
    seeker_download = await privacy_client.get(
        f"/api/recruiter/applications/{application_id}/resume",
        headers=headers_alice,
    )
    assert seeker_download.status_code == 403

    # Unauthenticated user CANNOT download -> 401 Unauthorized
    unauth_download = await privacy_client.get(
        f"/api/recruiter/applications/{application_id}/resume",
    )
    assert unauth_download.status_code == 401


@pytest.mark.asyncio
async def test_real_groq_integration_when_available(privacy_client):
    """Verifies the REAL Groq path when live credentials/service are available.
    If live Groq is unavailable or rate-limited, reports external availability status without silently pretending success.
    """
    if not settings.GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY is not configured; skipping live Groq network call.")

    uid, token = await register_user(privacy_client, "live.groq@privtest.io", "Live Candidate")
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = generate_test_pdf_bytes("Live Groq Integration Candidate Go Kafka Microservices")
    upload_res = await privacy_client.post(
        "/api/resumes/upload",
        files={"file": ("Live_Resume.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 201
    resume_id = upload_res.json()["id"]

    # Direct call to live Groq API (unmocked)
    res = await privacy_client.post(
        f"/api/resumes/{resume_id}/analyze",
        json={"jobDescription": "Senior Backend Go Kafka Engineer"},
        headers=headers,
    )
    # If live Groq is reachable and within rate limit -> 200
    # If live Groq is genuinely rate limited or down -> 503 (explicit error, no fake fallback)
    if res.status_code == 200:
        data = res.json()
        assert "atsScore" in data
        assert isinstance(data["atsScore"], int)
    else:
        assert res.status_code in [502, 503], f"Expected 200 or 502/503 from live Groq, got {res.status_code}: {res.text}"
