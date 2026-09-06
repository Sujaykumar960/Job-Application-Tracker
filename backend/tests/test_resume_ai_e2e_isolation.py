"""
End-to-End Test Suite for Resume AI Cross-User Data Leakage Prevention.

Verifies strict multi-tenant isolation between:
  - User A (Sujay - Seeker)
  - User B (Shivaaya - Recruiter)

Tests authentic end-to-end user workflows against MongoDB:
  1. User A (Sujay) registers, uploads Resume A, verifies library, analyzes, logs out.
  2. User B (Shivaaya) registers/logs in, verifies Resume A and its analysis are completely invisible.
  3. User B uploads Resume B, verifies library contains ONLY Resume B, never Resume A.
  4. User A logs back in, verifies Resume A appears, Resume B is absent, analysis is restored.
  5. User B attempts unauthorized access (GET resume, GET file, GET analysis, POST analyze, DELETE) on User A's resume.
  6. Direct MongoDB verification of independent record ownership and data integrity.
"""

import io
import pytest
import pytest_asyncio
import httpx
from bson import ObjectId

from app.database import DatabaseManager
from app.main import app


SUJAY_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj\n<< /Title (Sujay Distributed Systems Resume) >>\nendobj\n"
    b"2 0 obj\n<< /Length 130 >>\nstream\n"
    b"Sujay - Staff Systems Engineer with 8 years of experience in Go, Kafka, Distributed Consensus, High-Throughput Microservices.\n"
    b"endstream\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n240\n%%EOF"
)

SHIVAAYA_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj\n<< /Title (Shivaaya Recruiter Resume) >>\nendobj\n"
    b"2 0 obj\n<< /Length 125 >>\nstream\n"
    b"Shivaaya - Technical Talent Partner & Engineering Recruiter specializing in Staff+ Backend and Infrastructure Sourcing.\n"
    b"endstream\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n240\n%%EOF"
)


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean test data
    db = DatabaseManager.db
    if db is not None:
        await db.resumes.delete_many({})
        await db.resume_analyses.delete_many({})
        await db.files.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@e2e-isolation\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_and_login(client, name: str, email: str, role: str) -> tuple:
    """Register and login user, returning (user_id, token)."""
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": role,
        },
    )
    assert reg_res.status_code == 201, f"Registration failed for {name}: {reg_res.text}"
    user_id = reg_res.json()["user"]["id"]

    login_res = await client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": "Password123!",
        },
    )
    assert login_res.status_code == 200, f"Login failed for {name}: {login_res.text}"
    token = login_res.json()["access_token"]
    return user_id, token


@pytest.mark.asyncio
async def test_resume_ai_cross_user_data_leakage_e2e(client):
    """
    Complete end-to-end lifecycle test for Sujay (Seeker) and Shivaaya (Recruiter).
    """
    db = DatabaseManager.db

    # =========================================================================
    # STEP 1: USER A (Sujay - Seeker) LIFECYCLE
    # =========================================================================
    sujay_id, sujay_token = await register_and_login(
        client,
        name="Sujay",
        email="sujay.seeker@e2e-isolation.io",
        role="seeker",
    )
    # Ensure generated database ID is a unique ID and not the user's name
    assert sujay_id != "Sujay"
    sujay_headers = {"Authorization": f"Bearer {sujay_token}"}

    # 1.1 Upload Resume A
    files_a = {"file": ("Sujay_Distributed_Systems.pdf", io.BytesIO(SUJAY_PDF_BYTES), "application/pdf")}
    upload_a_res = await client.post("/api/resumes/upload", files=files_a, headers=sujay_headers)
    assert upload_a_res.status_code == 201, f"Upload failed: {upload_a_res.text}"
    resume_a_data = upload_a_res.json()
    resume_a_id = resume_a_data["id"]
    assert resume_a_data["userId"] == sujay_id
    assert resume_a_data["filename"] == "Sujay_Distributed_Systems.pdf"

    # 1.2 Verify Resume A appears in User A's Resume Library
    library_a_res = await client.get("/api/resumes", headers=sujay_headers)
    assert library_a_res.status_code == 200
    library_a = library_a_res.json()
    assert len(library_a) == 1
    assert library_a[0]["id"] == resume_a_id
    assert library_a[0]["userId"] == sujay_id
    assert library_a[0]["filename"] == "Sujay_Distributed_Systems.pdf"

    # 1.3 Analyze Resume A
    analyze_a_res = await client.post(
        f"/api/resumes/{resume_a_id}/analyze",
        json={"jobDescription": "Principal Systems Engineer"},
        headers=sujay_headers,
    )
    assert analyze_a_res.status_code == 200
    analysis_a_data = analyze_a_res.json()
    assert analysis_a_data["userId"] == sujay_id
    assert analysis_a_data["resumeId"] == resume_a_id
    assert "atsScore" in analysis_a_data
    assert analysis_a_data["atsScore"] is not None

    # 1.4 Verify active analysis belongs to Resume A
    current_analysis_a = await client.get("/api/resumes/analysis", headers=sujay_headers)
    assert current_analysis_a.status_code == 200
    assert current_analysis_a.json()["resumeId"] == resume_a_id
    assert current_analysis_a.json()["userId"] == sujay_id

    # 1.5 User A Logs Out (Invalidate local token context)
    sujay_headers_invalid = {"Authorization": "Bearer invalid_expired_token"}

    # =========================================================================
    # STEP 2: USER B (Shivaaya - Recruiter) LIFECYCLE
    # =========================================================================
    shivaaya_id, shivaaya_token = await register_and_login(
        client,
        name="Shivaaya",
        email="shivaaya.recruiter@e2e-isolation.io",
        role="recruiter",
    )
    # Ensure distinct database ownership ID
    assert shivaaya_id != "Shivaaya"
    assert shivaaya_id != sujay_id
    shivaaya_headers = {"Authorization": f"Bearer {shivaaya_token}"}

    # 2.1 User B opens Resume AI: Verify Resume A is NOT visible in library
    library_b_initial = await client.get("/api/resumes", headers=shivaaya_headers)
    assert library_b_initial.status_code == 200
    assert len(library_b_initial.json()) == 0, "User B must NEVER see User A's resumes!"

    # 2.2 Verify Resume A active resume is NOT visible to User B
    active_b_initial = await client.get("/api/resumes/active", headers=shivaaya_headers)
    assert active_b_initial.status_code == 200
    assert active_b_initial.json() is None, "User B must not receive User A's active resume!"

    # 2.3 Verify Resume A's analysis is NOT visible to User B
    analysis_b_initial = await client.get("/api/resumes/analysis", headers=shivaaya_headers)
    assert analysis_b_initial.status_code == 200
    assert analysis_b_initial.json() is None, "User B must not receive User A's analysis!"

    # 2.4 User B uploads Resume B
    files_b = {"file": ("Shivaaya_Recruiter_Ops.pdf", io.BytesIO(SHIVAAYA_PDF_BYTES), "application/pdf")}
    upload_b_res = await client.post("/api/resumes/upload", files=files_b, headers=shivaaya_headers)
    assert upload_b_res.status_code == 201
    resume_b_data = upload_b_res.json()
    resume_b_id = resume_b_data["id"]
    assert resume_b_data["userId"] == shivaaya_id
    assert resume_b_data["filename"] == "Shivaaya_Recruiter_Ops.pdf"
    assert resume_b_id != resume_a_id

    # 2.5 Verify Resume B appears in User B's Resume Library
    library_b_after = await client.get("/api/resumes", headers=shivaaya_headers)
    assert library_b_after.status_code == 200
    resumes_b = library_b_after.json()
    assert len(resumes_b) == 1
    assert resumes_b[0]["id"] == resume_b_id
    assert resumes_b[0]["userId"] == shivaaya_id
    assert resumes_b[0]["filename"] == "Shivaaya_Recruiter_Ops.pdf"

    # 2.6 Verify Resume A still does NOT appear for User B
    assert not any(r["id"] == resume_a_id for r in resumes_b)
    assert not any(r["userId"] == sujay_id for r in resumes_b)

    # =========================================================================
    # STEP 3: SWITCH BACK TO USER A (Sujay)
    # =========================================================================
    login_a_again = await client.post(
        "/api/auth/login",
        json={"email": "sujay.seeker@e2e-isolation.io", "password": "Password123!"},
    )
    assert login_a_again.status_code == 200
    sujay_token_fresh = login_a_again.json()["access_token"]
    sujay_headers_fresh = {"Authorization": f"Bearer {sujay_token_fresh}"}

    # 3.1 Verify Resume A appears for User A
    library_a_check = (await client.get("/api/resumes", headers=sujay_headers_fresh)).json()
    assert len(library_a_check) == 1
    assert library_a_check[0]["id"] == resume_a_id
    assert library_a_check[0]["userId"] == sujay_id

    # 3.2 Verify Resume B does NOT appear for User A
    assert not any(r["id"] == resume_b_id for r in library_a_check)
    assert not any(r["userId"] == shivaaya_id for r in library_a_check)

    # 3.3 Verify Resume A's analysis is restored
    analysis_a_restored = (await client.get("/api/resumes/analysis", headers=sujay_headers_fresh)).json()
    assert analysis_a_restored is not None
    assert analysis_a_restored["resumeId"] == resume_a_id
    assert analysis_a_restored["userId"] == sujay_id

    # 3.4 Verify active resume is User A's resume
    active_a_restored = (await client.get("/api/resumes/active", headers=sujay_headers_fresh)).json()
    assert active_a_restored is not None
    assert active_a_restored["id"] == resume_a_id
    assert active_a_restored["userId"] == sujay_id

    # =========================================================================
    # STEP 4: DIRECT UNAUTHORIZED ACCESS ATTEMPTS BY USER B ON USER A'S RESUME
    # =========================================================================
    # 4.1 User B attempts: GET /api/resumes/{userA_resume_id} -> 404 Not Found
    unauth_get = await client.get(f"/api/resumes/{resume_a_id}", headers=shivaaya_headers)
    assert unauth_get.status_code == 404

    # 4.2 User B attempts: GET /api/resumes/{userA_resume_id}/file -> 404 Not Found
    unauth_dl = await client.get(f"/api/resumes/{resume_a_id}/file", headers=shivaaya_headers)
    assert unauth_dl.status_code == 404

    # 4.3 User B attempts: GET /api/resumes/{userA_resume_id}/analysis -> 404 Not Found
    unauth_analysis = await client.get(f"/api/resumes/{resume_a_id}/analysis", headers=shivaaya_headers)
    assert unauth_analysis.status_code == 404

    # 4.4 User B attempts: GET /api/resumes/{userA_resume_id}/analyses -> 404 Not Found
    unauth_analyses = await client.get(f"/api/resumes/{resume_a_id}/analyses", headers=shivaaya_headers)
    assert unauth_analyses.status_code == 404

    # 4.5 User B attempts: POST /api/resumes/{userA_resume_id}/analyze -> 404 Not Found
    unauth_trigger = await client.post(
        f"/api/resumes/{resume_a_id}/analyze",
        json={"jobDescription": "Hacked Role"},
        headers=shivaaya_headers,
    )
    assert unauth_trigger.status_code == 404

    # 4.6 User B attempts: PATCH /api/resumes/{userA_resume_id}/active -> 404 Not Found
    unauth_activate = await client.patch(f"/api/resumes/{resume_a_id}/active", headers=shivaaya_headers)
    assert unauth_activate.status_code == 404

    # 4.7 User B attempts: DELETE /api/resumes/{userA_resume_id} -> 404 Not Found
    unauth_del = await client.delete(f"/api/resumes/{resume_a_id}", headers=shivaaya_headers)
    assert unauth_del.status_code == 404

    # 4.8 Verify User A's resume in MongoDB remains 100% intact!
    resume_a_in_db = await db.resumes.find_one({"id": resume_a_id, "userId": sujay_id})
    assert resume_a_in_db is not None, "User A's resume in MongoDB must remain intact and protected!"

    analysis_a_in_db = await db.resume_analyses.find_one({"resumeId": resume_a_id, "userId": sujay_id})
    assert analysis_a_in_db is not None, "User A's analysis in MongoDB must remain intact and protected!"

    # =========================================================================
    # STEP 5: DIRECT UNAUTHORIZED ACCESS ATTEMPTS BY USER A ON USER B'S RESUME
    # =========================================================================
    # 5.1 User A attempts: GET /api/resumes/{userB_resume_id} -> 404 Not Found
    a_gets_b = await client.get(f"/api/resumes/{resume_b_id}", headers=sujay_headers_fresh)
    assert a_gets_b.status_code == 404

    # 5.2 User A attempts: DELETE /api/resumes/{userB_resume_id} -> 404 Not Found
    a_deletes_b = await client.delete(f"/api/resumes/{resume_b_id}", headers=sujay_headers_fresh)
    assert a_deletes_b.status_code == 404

    # 5.3 Verify User B's resume in MongoDB remains 100% intact!
    resume_b_in_db = await db.resumes.find_one({"id": resume_b_id, "userId": shivaaya_id})
    assert resume_b_in_db is not None, "User B's resume in MongoDB must remain intact and protected!"
