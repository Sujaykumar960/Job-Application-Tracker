import io
import pytest
import pytest_asyncio
import httpx
from bson import ObjectId

from app.database import DatabaseManager
from app.main import app


VALID_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj\n<< /Title (Candidate Resume) >>\nendobj\n"
    b"2 0 obj\n<< /Length 120 >>\nstream\n"
    b"Senior Software Engineer with 6 years of experience in Go, Python, React, MongoDB and Distributed Systems.\n"
    b"endstream\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n240\n%%EOF"
)


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.candidates.delete_many({})
        await db.recruiter_interactions.delete_many({})
        await db.resumes.delete_many({})
        await db.resume_analyses.delete_many({})
        await db.files.delete_many({})
        await db.applications.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@recruiterprivacy\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker", company: str = "") -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Registration failed: {res.text}"
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]

    if company:
        db = DatabaseManager.db
        id_q = {"$or": [{"id": user_id}, {"_id": ObjectId(user_id)}]} if ObjectId.is_valid(user_id) else {"id": user_id}
        await db.users.update_one(id_q, {"$set": {"company": company}})
        await db.profiles.update_one({"userId": user_id}, {"$set": {"company": company}}, upsert=True)

    return user_id, token


@pytest.mark.asyncio
async def test_recruiter_cannot_access_seeker_private_resume_library_or_endpoints(client):
    """
    Ensure recruiter's Resume AI screen and API calls cannot access a seeker's private Resume Library:
      - GET /api/resumes
      - GET /api/resumes/{resume_id}
      - GET /api/resumes/{resume_id}/file
      - GET /api/resumes/{resume_id}/analysis
    Dual ownership ensures non-owners receive 404 Not Found.
    """
    seeker_id, seeker_token = await register_user(client, "alice.seeker@recruiterprivacy.io", "Alice Seeker", role="seeker")
    recruiter_id, recruiter_token = await register_user(client, "bob.recruiter@recruiterprivacy.io", "Bob Recruiter", role="recruiter", company="TechCorp")

    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 1. Seeker uploads private resume
    files = {"file": ("alice_confidential_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=seeker_headers)
    assert upload_res.status_code == 201
    alice_resume_id = upload_res.json()["id"]

    # 2. Recruiter lists resumes: GET /api/resumes -> returns ONLY recruiter's resumes (empty), NEVER Alice's
    recruiter_resumes = (await client.get("/api/resumes", headers=recruiter_headers)).json()
    assert len(recruiter_resumes) == 0, "Recruiter must not see seeker's private resumes in resume library"

    # 3. Recruiter attempts to access seeker's resume metadata by ID -> 404 Not Found
    recruiter_get_resume = await client.get(f"/api/resumes/{alice_resume_id}", headers=recruiter_headers)
    assert recruiter_get_resume.status_code == 404

    # 4. Recruiter attempts to download seeker's resume file directly -> 404 Not Found
    recruiter_dl_resume = await client.get(f"/api/resumes/{alice_resume_id}/file", headers=recruiter_headers)
    assert recruiter_dl_resume.status_code == 404

    # 5. Recruiter attempts to access seeker's resume AI analysis -> 404 Not Found
    recruiter_get_analysis = await client.get(f"/api/resumes/{alice_resume_id}/analysis", headers=recruiter_headers)
    assert recruiter_get_analysis.status_code == 404


@pytest.mark.asyncio
async def test_recruiter_rbac_on_candidate_resume_endpoint(client):
    """
    Ensure only recruiters and admins can call GET /api/recruiter/candidates/{candidate_id}/resume.
    Seekers receive 403 Forbidden; unauthenticated receive 401.
    """
    _, seeker_token = await register_user(client, "sam.seeker@recruiterprivacy.io", "Sam Seeker", role="seeker")
    _, recruiter_token = await register_user(client, "rachel.recruiter@recruiterprivacy.io", "Rachel Recruiter", role="recruiter", company="TechCorp")

    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 1. Unauthenticated -> 401
    res_unauth = await client.get("/api/recruiter/candidates/cand-2/resume")
    assert res_unauth.status_code in [401, 403]

    # 2. Seeker user -> 403 Forbidden
    res_seeker = await client.get("/api/recruiter/candidates/cand-2/resume", headers=seeker_headers)
    assert res_seeker.status_code == 403

    # 3. Recruiter user -> 200 OK (for visible candidate Elena Rostova cand-2)
    res_recruiter = await client.get("/api/recruiter/candidates/cand-2/resume", headers=recruiter_headers)
    assert res_recruiter.status_code == 200


@pytest.mark.asyncio
async def test_candidate_resume_undiscoverable_if_not_looking(client):
    """
    Candidate Rachel Green (cand-7) has searchStatus == "not_looking".
    Recruiter attempting to download resume receives 404 Not Found.
    """
    _, recruiter_token = await register_user(client, "recruiter.looking@recruiterprivacy.io", "Recruiter Looking", role="recruiter", company="Meta")
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    res = await client.get("/api/recruiter/candidates/cand-7/resume", headers=recruiter_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_candidate_resume_cloaked_from_current_employer(client):
    """
    Candidate Alex Rivera (cand-1) is cloaked from current employer 'CloudScale'.
    - Recruiter at CloudScale -> 403 Forbidden.
    - Recruiter at Stripe -> 200 OK.
    """
    _, cloudscale_token = await register_user(client, "rec.cloudscale@recruiterprivacy.io", "CloudScale Rec", role="recruiter", company="CloudScale")
    _, stripe_token = await register_user(client, "rec.stripe@recruiterprivacy.io", "Stripe Rec", role="recruiter", company="Stripe")

    cloudscale_headers = {"Authorization": f"Bearer {cloudscale_token}"}
    stripe_headers = {"Authorization": f"Bearer {stripe_token}"}

    # CloudScale recruiter blocked by employer cloaking
    res_cloudscale = await client.get("/api/recruiter/candidates/cand-1/resume", headers=cloudscale_headers)
    assert res_cloudscale.status_code == 403
    assert "employer cloaking" in res_cloudscale.json()["detail"].lower()

    # Stripe recruiter allowed
    res_stripe = await client.get("/api/recruiter/candidates/cand-1/resume", headers=stripe_headers)
    assert res_stripe.status_code == 200
    assert "Alex Rivera" in res_stripe.text


@pytest.mark.asyncio
async def test_candidate_resume_contact_visibility_hidden(client):
    """
    Candidate Sophia Patel (cand-4) has contactVisibility == "hidden".
    Recruiter attempting to download resume receives 403 Forbidden.
    """
    _, recruiter_token = await register_user(client, "rec.hidden@recruiterprivacy.io", "Hidden Test Recruiter", role="recruiter", company="Amazon")
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    res = await client.get("/api/recruiter/candidates/cand-4/resume", headers=recruiter_headers)
    assert res.status_code == 403
    assert "hidden" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_candidate_resume_contact_visibility_mutual_matches(client):
    """
    Candidate Devin Chen (cand-3) has contactVisibility == "mutual_matches".
    - Without interaction/match -> 403 Forbidden.
    - After recruiter shortlists candidate -> 200 OK.
    """
    recruiter_id, recruiter_token = await register_user(client, "rec.mutual@recruiterprivacy.io", "Mutual Recruiter", role="recruiter", company="Apple")
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 1. No mutual match initially -> 403 Forbidden
    res_blocked = await client.get("/api/recruiter/candidates/cand-3/resume", headers=recruiter_headers)
    assert res_blocked.status_code == 403
    assert "mutual match" in res_blocked.json()["detail"].lower()

    # 2. Recruiter shortlists candidate cand-3
    shortlist_res = await client.post("/api/recruiter/candidates/cand-3/shortlist", headers=recruiter_headers)
    assert shortlist_res.status_code == 200

    # 3. Recruiter now accesses resume -> 200 OK
    res_allowed = await client.get("/api/recruiter/candidates/cand-3/resume", headers=recruiter_headers)
    assert res_allowed.status_code == 200
    assert "Devin Chen" in res_allowed.text


@pytest.mark.asyncio
async def test_candidate_uploaded_resume_file_streaming(client):
    """
    When a seeker uploads a real resume document and sets contactVisibility to 'all_recruiters',
    an authorized recruiter can download the actual uploaded file bytes via the recruiter candidate endpoint.
    """
    seeker_id, seeker_token = await register_user(client, "elena.uploaded@recruiterprivacy.io", "Elena Real", role="seeker")
    _, recruiter_token = await register_user(client, "rec.real@recruiterprivacy.io", "Real Recruiter", role="recruiter", company="Google")

    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 1. Seeker sets privacy to visible for all recruiters
    db = DatabaseManager.db
    await db.profiles.update_one(
        {"userId": seeker_id},
        {"$set": {
            "privacy": {
                "searchStatus": "actively_looking",
                "showSalary": True,
                "contactVisibility": "all_recruiters",
                "cloakedFromCurrentEmployer": False,
            }
        }},
        upsert=True,
    )

    # 2. Seeker uploads PDF resume
    files = {"file": ("Elena_Verified_CV.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=seeker_headers)
    assert upload_res.status_code == 201

    # 3. Recruiter downloads candidate resume via /api/recruiter/candidates/{seeker_id}/resume
    recruiter_res = await client.get(f"/api/recruiter/candidates/{seeker_id}/resume", headers=recruiter_headers)
    assert recruiter_res.status_code == 200
    assert recruiter_res.content == VALID_PDF_BYTES
