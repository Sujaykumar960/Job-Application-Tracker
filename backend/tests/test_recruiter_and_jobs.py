import io
import pytest
import pytest_asyncio
import httpx
from reportlab.pdfgen import canvas

from app.database import DatabaseManager
from app.main import app
from app.storage import get_storage_backend


def generate_valid_pdf_bytes(text: str = "Elena Rostova Lead ML Engineer. Skills: Python, PyTorch, Kubernetes.") -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Education: MS Computer Science, Stanford, 2024")
    c.save()
    return buf.getvalue()


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    db = DatabaseManager.db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test database collections
    if db is not None:
        await db.jobs.delete_many({"company": {"$regex": "^(TestStripe|TestLinear|TestGoogle|TestPhase6|AcmeCorp).*"}})
        await db.applications.delete_many({"company": {"$regex": "^(TestStripe|TestLinear|TestGoogle|TestPhase6|AcmeCorp).*"}})
        await db.companies.delete_many({"name": {"$regex": "^(TestPhase6|AcmeCorp).*"}})
        await db.users.delete_many({"email": {"$regex": ".*@phase6test\\.io$"}})
        await db.resumes.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker") -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    data = res.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    return user_id, token


@pytest.mark.asyncio
async def test_recruiter_create_job_authoritative_identity(client):
    """Verify recruiterId and postedBy are stamped server-side from JWT."""
    recruiter_id, recruiter_token = await register_user(client, "rec1@phase6test.io", "Recruiter One", role="recruiter")
    headers = {"Authorization": f"Bearer {recruiter_token}"}

    job_payload = {
        "title": "Senior Cloud Architect",
        "company": "TestPhase6_1",
        "location": "Remote",
        "salaryRange": "$160,000 - $200,000",
        "workType": "Remote",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Cloud",
        "skills": [{"name": "AWS", "isMatched": False}],
        "description": "Lead multi-cloud infrastructure.",
        "recruiterId": "forged_recruiter_id",
        "postedBy": "forged_posted_by",
    }

    res = await client.post("/api/jobs", json=job_payload, headers=headers)
    assert res.status_code == 201
    job = res.json()
    assert job["recruiterId"] == recruiter_id
    assert job["postedBy"] == recruiter_id
    assert job["status"] == "published"


@pytest.mark.asyncio
async def test_seeker_and_unauthenticated_cannot_create_job(client):
    """Seekers and unauthenticated requests cannot create job listings."""
    _, seeker_token = await register_user(client, "seeker1@phase6test.io", "Seeker One", role="seeker")
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}

    job_payload = {
        "title": "Junior Developer",
        "company": "TestPhase6_Seeker",
        "location": "Remote",
        "salaryRange": "$80,000 - $100,000",
        "description": "Junior dev work.",
    }

    # 1. Unauthenticated -> 401
    res_unauth = await client.post("/api/jobs", json=job_payload)
    assert res_unauth.status_code == 401

    # 2. Seeker -> 403
    res_seeker = await client.post("/api/jobs", json=job_payload, headers=seeker_headers)
    assert res_seeker.status_code == 403


@pytest.mark.asyncio
async def test_recruiter_ownership_update_and_delete(client):
    """Recruiter A can update/delete their own job; Recruiter B gets 403 Forbidden."""
    rec1_id, rec1_token = await register_user(client, "recA@phase6test.io", "Recruiter A", role="recruiter")
    rec2_id, rec2_token = await register_user(client, "recB@phase6test.io", "Recruiter B", role="recruiter")
    _, admin_token = await register_user(client, "admin@phase6test.io", "Admin User", role="admin")

    h_rec1 = {"Authorization": f"Bearer {rec1_token}"}
    h_rec2 = {"Authorization": f"Bearer {rec2_token}"}
    h_admin = {"Authorization": f"Bearer {admin_token}"}

    # Recruiter A creates job
    create_res = await client.post("/api/jobs", json={
        "title": "Database Engineer",
        "company": "TestPhase6_A",
        "location": "Remote",
        "salaryRange": "$140,000 - $170,000",
        "description": "Postgres and Mongo optimization.",
    }, headers=h_rec1)
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    # Recruiter B attempts to update -> 403 Forbidden
    patch_b = await client.patch(f"/api/jobs/{job_id}", json={"title": "Hacked Title"}, headers=h_rec2)
    assert patch_b.status_code == 403

    # Recruiter B attempts to delete -> 403 Forbidden
    del_b = await client.delete(f"/api/jobs/{job_id}", headers=h_rec2)
    assert del_b.status_code == 403

    # Recruiter A updates own job -> 200 OK
    patch_a = await client.patch(f"/api/jobs/{job_id}", json={"title": "Staff Database Engineer"}, headers=h_rec1)
    assert patch_a.status_code == 200
    assert patch_a.json()["title"] == "Staff Database Engineer"

    # Admin can update any job -> 200 OK
    patch_admin = await client.patch(f"/api/jobs/{job_id}", json={"title": "Principal Database Engineer"}, headers=h_admin)
    assert patch_admin.status_code == 200
    assert patch_admin.json()["title"] == "Principal Database Engineer"

    # Recruiter A closes job -> status becomes closed and isActive becomes False
    patch_close = await client.patch(f"/api/jobs/{job_id}", json={"status": "closed"}, headers=h_rec1)
    assert patch_close.status_code == 200
    assert patch_close.json()["status"] == "closed"
    assert patch_close.json()["isActive"] is False

    # Recruiter A deletes own job -> 200 OK
    del_a = await client.delete(f"/api/jobs/{job_id}", headers=h_rec1)
    assert del_a.status_code == 200


@pytest.mark.asyncio
async def test_closed_job_hidden_from_public_search(client):
    """Closed jobs do not appear in default public job search."""
    _, rec_token = await register_user(client, "rec_search@phase6test.io", "Recruiter Search", role="recruiter")
    headers = {"Authorization": f"Bearer {rec_token}"}

    # Create published job
    res_pub = await client.post("/api/jobs", json={
        "title": "Open Kernel Engineer",
        "company": "TestPhase6_Search",
        "location": "Remote",
        "salaryRange": "$150,000 - $180,000",
        "description": "Kernel dev.",
        "status": "published",
    }, headers=headers)
    assert res_pub.status_code == 201
    pub_id = res_pub.json()["id"]

    # Create closed job
    res_closed = await client.post("/api/jobs", json={
        "title": "Closed Kernel Engineer",
        "company": "TestPhase6_Search",
        "location": "Remote",
        "salaryRange": "$150,000 - $180,000",
        "description": "Kernel dev closed.",
        "status": "closed",
    }, headers=headers)
    assert res_closed.status_code == 201
    closed_id = res_closed.json()["id"]

    # Public search
    search_res = await client.get("/api/jobs?search=Kernel")
    assert search_res.status_code == 200
    returned_ids = [j["id"] for j in search_res.json()]
    assert pub_id in returned_ids
    assert closed_id not in returned_ids


@pytest.mark.asyncio
async def test_seeker_apply_workflow_and_guards(client):
    """Test full application workflow: success, closed job rejection, duplicate rejection."""
    _, rec_token = await register_user(client, "rec_apply@phase6test.io", "Recruiter Apply", role="recruiter")
    _, seeker_token = await register_user(client, "seeker_apply@phase6test.io", "Seeker Apply", role="seeker")

    h_rec = {"Authorization": f"Bearer {rec_token}"}
    h_seeker = {"Authorization": f"Bearer {seeker_token}"}

    # Recruiter creates active job
    res_active = await client.post("/api/jobs", json={
        "title": "Frontend Architect",
        "company": "TestPhase6_Apply",
        "location": "Remote",
        "salaryRange": "$150,000 - $190,000",
        "description": "Lead Next.js platform.",
    }, headers=h_rec)
    active_job_id = res_active.json()["id"]

    # Recruiter creates closed job
    res_closed = await client.post("/api/jobs", json={
        "title": "Legacy Architect",
        "company": "TestPhase6_Apply",
        "location": "Remote",
        "salaryRange": "$150,000 - $190,000",
        "description": "Closed role.",
        "status": "closed",
    }, headers=h_rec)
    closed_job_id = res_closed.json()["id"]

    # 1. Seeker applies to active job -> 201 Created
    app_res = await client.post("/api/applications", json={
        "jobId": active_job_id,
        "company": "TestPhase6_Apply",
        "role": "Frontend Architect",
    }, headers=h_seeker)
    assert app_res.status_code == 201
    app_data = app_res.json()
    assert app_data["jobId"] == active_job_id
    assert app_data["status"] == "Applied"

    # 2. Seeker attempts to apply again to the same job -> 409 Conflict
    dup_res = await client.post("/api/applications", json={
        "jobId": active_job_id,
        "company": "TestPhase6_Apply",
        "role": "Frontend Architect",
    }, headers=h_seeker)
    assert dup_res.status_code == 409

    # 3. Seeker attempts to apply to closed job -> 400 Bad Request
    closed_app_res = await client.post("/api/applications", json={
        "jobId": closed_job_id,
        "company": "TestPhase6_Apply",
        "role": "Legacy Architect",
    }, headers=h_seeker)
    assert closed_app_res.status_code == 400


@pytest.mark.asyncio
async def test_recruiter_portal_jobs_and_applicants(client):
    """Test recruiter viewing their own jobs, applicant listing, and RBAC isolation."""
    rec1_id, rec1_token = await register_user(client, "rec_hub1@phase6test.io", "Hub Recruiter 1", role="recruiter")
    rec2_id, rec2_token = await register_user(client, "rec_hub2@phase6test.io", "Hub Recruiter 2", role="recruiter")
    _, seeker_token = await register_user(client, "seeker_hub@phase6test.io", "Hub Seeker", role="seeker")

    h_rec1 = {"Authorization": f"Bearer {rec1_token}"}
    h_rec2 = {"Authorization": f"Bearer {rec2_token}"}
    h_seeker = {"Authorization": f"Bearer {seeker_token}"}

    # Recruiter 1 creates 2 jobs
    job1_res = await client.post("/api/jobs", json={
        "title": "Rust Core Engineer",
        "company": "TestPhase6_Hub1",
        "location": "Remote",
        "description": "Rust networking.",
    }, headers=h_rec1)
    job1_id = job1_res.json()["id"]

    job2_res = await client.post("/api/jobs", json={
        "title": "Systems Core Engineer",
        "company": "TestPhase6_Hub1",
        "location": "Remote",
        "description": "C++ systems.",
    }, headers=h_rec1)
    job2_id = job2_res.json()["id"]

    # Recruiter 2 creates 1 job
    job3_res = await client.post("/api/jobs", json={
        "title": "Mobile Core Engineer",
        "company": "TestPhase6_Hub2",
        "location": "Remote",
        "description": "iOS platform.",
    }, headers=h_rec2)
    job3_id = job3_res.json()["id"]

    # Seeker applies to Recruiter 1's Job 1
    await client.post("/api/applications", json={
        "jobId": job1_id,
        "company": "TestPhase6_Hub1",
        "role": "Rust Core Engineer",
    }, headers=h_seeker)

    # 1. Recruiter 1 gets own jobs -> 2 jobs returned, Job 1 has applicantsCount == 1, Job 2 has 0
    rec1_jobs = await client.get("/api/recruiter/jobs", headers=h_rec1)
    assert rec1_jobs.status_code == 200
    jobs_data = rec1_jobs.json()
    assert len(jobs_data) == 2
    j1 = next(j for j in jobs_data if j["id"] == job1_id)
    j2 = next(j for j in jobs_data if j["id"] == job2_id)
    assert j1["applicantsCount"] == 1
    assert j2["applicantsCount"] == 0

    # 2. Recruiter 1 views applicants for Job 1 -> 200 OK with 1 applicant
    apps_res = await client.get(f"/api/recruiter/jobs/{job1_id}/applications", headers=h_rec1)
    assert apps_res.status_code == 200
    apps_list = apps_res.json()
    assert len(apps_list) == 1
    assert apps_list[0]["jobId"] == job1_id
    assert apps_list[0]["applicantName"] == "Hub Seeker"

    # 3. Recruiter 2 attempts to view applicants for Recruiter 1's Job 1 -> 403 Forbidden
    unauth_apps = await client.get(f"/api/recruiter/jobs/{job1_id}/applications", headers=h_rec2)
    assert unauth_apps.status_code == 403

    # 4. Recruiter 1 gets all applications across jobs
    all_apps = await client.get("/api/recruiter/applications", headers=h_rec1)
    assert all_apps.status_code == 200
    assert len(all_apps.json()) == 1


@pytest.mark.asyncio
async def test_recruiter_update_application_status_pipeline(client):
    """Recruiter updates candidate application stage through the recruitment pipeline."""
    _, rec1_token = await register_user(client, "rec_pipeline1@phase6test.io", "Pipeline Rec 1", role="recruiter")
    _, rec2_token = await register_user(client, "rec_pipeline2@phase6test.io", "Pipeline Rec 2", role="recruiter")
    seeker_id, seeker_token = await register_user(client, "seeker_pipe@phase6test.io", "Pipeline Seeker", role="seeker")

    h_rec1 = {"Authorization": f"Bearer {rec1_token}"}
    h_rec2 = {"Authorization": f"Bearer {rec2_token}"}
    h_seeker = {"Authorization": f"Bearer {seeker_token}"}

    # Create job and apply
    job_res = await client.post("/api/jobs", json={
        "title": "Site Reliability Engineer",
        "company": "TestPhase6_Pipe",
        "location": "Remote",
        "description": "Reliability.",
    }, headers=h_rec1)
    job_id = job_res.json()["id"]

    app_res = await client.post("/api/applications", json={
        "jobId": job_id,
        "company": "TestPhase6_Pipe",
        "role": "Site Reliability Engineer",
    }, headers=h_seeker)
    app_id = app_res.json()["id"]

    # 1. Recruiter 2 attempts to advance Recruiter 1's applicant -> 403 Forbidden
    hacked_update = await client.patch(f"/api/recruiter/applications/{app_id}/status", json={
        "status": "Offer",
    }, headers=h_rec2)
    assert hacked_update.status_code == 403

    # 2. Seeker attempts to promote self to Offer -> 403 Forbidden
    seeker_cheat = await client.patch(f"/api/applications/{app_id}", json={
        "status": "Offer",
    }, headers=h_seeker)
    assert seeker_cheat.status_code == 403

    # 3. Recruiter 1 advances applicant to Screening -> Shortlisted -> Interview -> Offer -> Hired
    for next_stage in ["Screening", "Shortlisted", "Interview", "Offer", "Hired"]:
        up_res = await client.patch(f"/api/recruiter/applications/{app_id}/status", json={
            "status": next_stage,
            "notes": f"Candidate successfully completed {next_stage} stage.",
        }, headers=h_rec1)
        assert up_res.status_code == 200
        assert up_res.json()["status"] == next_stage


@pytest.mark.asyncio
async def test_recruiter_resume_privacy_boundary(client):
    """Recruiter can download resume ONLY if candidate applied to their job; unrelated resumes return 403."""
    _, rec1_token = await register_user(client, "rec_res1@phase6test.io", "Recruiter Res 1", role="recruiter")
    _, rec2_token = await register_user(client, "rec_res2@phase6test.io", "Recruiter Res 2", role="recruiter")
    seeker_id, seeker_token = await register_user(client, "seeker_res@phase6test.io", "Resume Seeker", role="seeker")

    h_rec1 = {"Authorization": f"Bearer {rec1_token}"}
    h_rec2 = {"Authorization": f"Bearer {rec2_token}"}
    h_seeker = {"Authorization": f"Bearer {seeker_token}"}

    # Seeker uploads real PDF resume
    valid_pdf_bytes = generate_valid_pdf_bytes()
    upload_res = await client.post(
        "/api/resumes/upload",
        files={"file": ("seeker_resume.pdf", io.BytesIO(valid_pdf_bytes), "application/pdf")},
        headers=h_seeker,
    )
    assert upload_res.status_code == 201
    resume_id = upload_res.json()["id"]

    # Recruiter 1 posts job
    job1_res = await client.post("/api/jobs", json={
        "title": "Machine Learning Engineer",
        "company": "TestPhase6_Resume",
        "location": "Remote",
        "description": "Deep learning models.",
    }, headers=h_rec1)
    job1_id = job1_res.json()["id"]

    # Seeker applies to Recruiter 1's job with the resume
    app_res = await client.post("/api/applications", json={
        "jobId": job1_id,
        "company": "TestPhase6_Resume",
        "role": "Machine Learning Engineer",
        "resumeId": resume_id,
    }, headers=h_seeker)
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # Recruiter 1 accesses candidate resume -> 200 OK
    res_stream = await client.get(f"/api/recruiter/applications/{app_id}/resume", headers=h_rec1)
    assert res_stream.status_code == 200
    assert len(res_stream.content) > 0

    # Recruiter 2 attempts to access candidate resume -> 403 Forbidden
    res_unauth = await client.get(f"/api/recruiter/applications/{app_id}/resume", headers=h_rec2)
    assert res_unauth.status_code == 403


@pytest.mark.asyncio
async def test_companies_directory_dynamic_jobs_and_management(client):
    """Test partner companies with dynamic openJobsCount and recruiter profile updates."""
    rec_id, rec_token = await register_user(client, "rec_comp@phase6test.io", "Comp Recruiter", role="recruiter")
    _, rec_other_token = await register_user(client, "rec_other@phase6test.io", "Other Recruiter", role="recruiter")

    h_rec = {"Authorization": f"Bearer {rec_token}"}
    h_other = {"Authorization": f"Bearer {rec_other_token}"}

    # Recruiter creates company
    comp_res = await client.post("/api/companies", json={
        "name": "AcmeCorp AI",
        "industry": "Artificial Intelligence",
        "headquarters": "San Francisco, CA",
        "about": "Autonomous developer tools.",
    }, headers=h_rec)
    assert comp_res.status_code == 201
    comp = comp_res.json()
    comp_id = comp["id"]
    assert comp["name"] == "AcmeCorp AI"
    assert comp["openJobsCount"] == 0

    # Recruiter posts 2 published jobs for this company
    await client.post("/api/jobs", json={
        "title": "AI Research Scientist",
        "company": "AcmeCorp AI",
        "companyId": comp_id,
        "location": "Remote",
        "description": "Foundation models.",
        "status": "published",
    }, headers=h_rec)
    await client.post("/api/jobs", json={
        "title": "AI Systems Engineer",
        "company": "AcmeCorp AI",
        "companyId": comp_id,
        "location": "Remote",
        "description": "Inference optimization.",
        "status": "published",
    }, headers=h_rec)

    # Recruiter posts 1 closed job
    await client.post("/api/jobs", json={
        "title": "Deprecated AI Engineer",
        "company": "AcmeCorp AI",
        "companyId": comp_id,
        "location": "Remote",
        "description": "Old stack.",
        "status": "closed",
    }, headers=h_rec)

    # Fetch company dossier -> dynamic openJobsCount must strictly equal 2 (excluding closed job)
    get_comp = await client.get(f"/api/companies/{comp_id}")
    assert get_comp.status_code == 200
    assert get_comp.json()["openJobsCount"] == 2

    # Recruiter updates company details -> 200 OK
    patch_comp = await client.patch(f"/api/companies/{comp_id}", json={
        "tagline": "Pioneering next-generation developer intelligence.",
    }, headers=h_rec)
    assert patch_comp.status_code == 200
    assert patch_comp.json()["tagline"] == "Pioneering next-generation developer intelligence."

    # Other recruiter attempts to modify company -> 403 Forbidden
    other_patch = await client.patch(f"/api/companies/{comp_id}", json={
        "tagline": "Hacked tagline.",
    }, headers=h_other)
    assert other_patch.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_and_seeker_cannot_access_recruiter_portal(client):
    """Ensure recruiter portal endpoints are strictly protected by RBAC."""
    _, seeker_token = await register_user(client, "seeker_unauth@phase6test.io", "Seeker Unauth", role="seeker")
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}

    recruiter_endpoints = [
        ("GET", "/api/recruiter/metrics"),
        ("GET", "/api/recruiter/jobs"),
        ("GET", "/api/recruiter/applications"),
        ("GET", "/api/recruiter/candidates"),
    ]

    for method, path in recruiter_endpoints:
        # 1. Unauthenticated -> 401
        if method == "GET":
            unauth_res = await client.get(path)
        assert unauth_res.status_code == 401, f"Expected 401 for unauthenticated {path}"

        # 2. Seeker role -> 403
        if method == "GET":
            seeker_res = await client.get(path, headers=seeker_headers)
        assert seeker_res.status_code == 403, f"Expected 403 for seeker {path}"


@pytest.mark.asyncio
async def test_recruiter_metrics_zero_baseline(client):
    """A fresh recruiter has 0 jobs posted, 0 applications, 0 shortlists, 0 interviews, 0 hired."""
    _, rec_token = await register_user(client, "fresh_rec@phase6test.io", "Fresh Recruiter", role="recruiter")
    headers = {"Authorization": f"Bearer {rec_token}"}

    res = await client.get("/api/recruiter/metrics", headers=headers)
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["jobsPosted"] == 0
    assert metrics["applicationsCount"] == 0
    assert metrics["shortlistedCount"] == 0
    assert metrics["interviewsCount"] == 0
    assert metrics["hiredCount"] == 0

