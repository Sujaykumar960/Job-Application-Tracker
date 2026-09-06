from datetime import datetime, timedelta, timezone
import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test collections
    db = DatabaseManager.db
    if db is not None:
        await db.jobs.delete_many({"company": {"$in": ["TestStripe", "TestGoogle", "TestLinear", "TestDatadog", "TestFigma"]}})
        await db.applications.delete_many({"company": {"$regex": "^Test.*"}})
        await db.users.delete_many({"email": {"$regex": ".*@jobapptest\\.io$"}})
        await db.profiles.delete_many({})


async def create_user_and_token(client, email: str, name: str, role: str = "seeker") -> str:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_job_crud_and_salary_parsing(client):
    job_payload = {
        "title": "Staff Ledger Engineer",
        "company": "TestStripe",
        "location": "San Francisco, CA",
        "salaryRange": "$180,000 - $220,000",
        "workType": "Hybrid",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Distributed Systems",
        "skills": [{"name": "Go", "isMatched": False}, {"name": "Kafka", "isMatched": False}],
        "requiredSkills": ["Go", "Kafka"],
        "description": "Design transaction pipelines.",
    }

    # 1. Create Job
    create_res = await client.post("/api/jobs", json=job_payload)
    assert create_res.status_code == 201
    job_data = create_res.json()
    job_id = job_data["id"]
    assert job_data["company"] == "TestStripe"
    assert job_data["salaryMin"] == 180000
    assert job_data["salaryMax"] == 220000

    # 2. Get Job By ID
    get_res = await client.get(f"/api/jobs/{job_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Staff Ledger Engineer"

    # 3. Update Job
    patch_res = await client.patch(f"/api/jobs/{job_id}", json={"title": "Principal Ledger Architect"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Principal Ledger Architect"

    # 4. Delete Job
    del_res = await client.delete(f"/api/jobs/{job_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 5. Verify 404 after deletion
    verify_res = await client.get(f"/api/jobs/{job_id}")
    assert verify_res.status_code == 404


@pytest.mark.asyncio
async def test_job_filtering_and_pagination(client):
    # Seed 3 distinct jobs
    jobs = [
        {
            "title": "Backend Telemetry Intern",
            "company": "TestGoogle",
            "location": "Bangalore",
            "salaryRange": "$60,000 - $80,000",
            "workType": "Hybrid",
            "jobType": "Internship",
            "experienceLevel": "Intern",
            "roleCategory": "Backend",
            "skills": [{"name": "Python", "isMatched": False}, {"name": "SQL", "isMatched": False}],
            "description": "Telemetry pipelines in Python.",
        },
        {
            "title": "Senior Frontend Engineer",
            "company": "TestLinear",
            "location": "Remote",
            "salaryRange": "$160,000 - $190,000",
            "workType": "Remote",
            "jobType": "Full-time",
            "experienceLevel": "Senior",
            "roleCategory": "Frontend",
            "skills": [{"name": "React", "isMatched": False}, {"name": "TypeScript", "isMatched": False}],
            "description": "Build high-speed desktop-grade UI.",
        },
        {
            "title": "SRE Platform Architect",
            "company": "TestDatadog",
            "location": "New York, NY",
            "salaryRange": "$200,000 - $240,000",
            "workType": "On-site",
            "jobType": "Full-time",
            "experienceLevel": "Lead",
            "roleCategory": "DevOps",
            "skills": [{"name": "Kubernetes", "isMatched": False}, {"name": "Go", "isMatched": False}],
            "description": "Global multi-cloud container orchestration.",
        },
    ]

    for j in jobs:
        await client.post("/api/jobs", json=j)

    # Filter by search
    res = await client.get("/api/jobs?search=telemetry")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["company"] == "TestGoogle"

    # Filter by company
    res = await client.get("/api/jobs?company=TestLinear")
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Senior Frontend Engineer"

    # Filter by location
    res = await client.get("/api/jobs?location=Remote")
    assert any(j["company"] == "TestLinear" for j in res.json())

    # Filter by experienceLevel
    res = await client.get("/api/jobs?experienceLevel=Intern")
    assert len(res.json()) >= 1
    assert any(j["company"] == "TestGoogle" for j in res.json())
    assert all(j["experienceLevel"] == "Intern" for j in res.json())

    # Filter by workType
    res = await client.get("/api/jobs?workType=Remote")
    assert all(j["workType"] == "Remote" for j in res.json())

    # Filter by jobType
    res = await client.get("/api/jobs?jobType=Internship")
    assert len(res.json()) >= 1
    assert any(j["company"] == "TestGoogle" for j in res.json())
    assert all(j["jobType"] == "Internship" for j in res.json())

    # Filter by skills
    res = await client.get("/api/jobs?skills=React")
    assert len(res.json()) == 1
    assert res.json()[0]["company"] == "TestLinear"

    # Filter by minSalary
    res = await client.get("/api/jobs?minSalary=195000")
    assert any(j["company"] == "TestDatadog" for j in res.json())

    # Test Pagination (limit=1, page=1 and page=2)
    p1 = await client.get("/api/jobs?company=TestGoogle&limit=1&page=1")
    assert p1.status_code == 200
    assert len(p1.json()) == 1
    assert "X-Total-Count" in p1.headers


@pytest.mark.asyncio
async def test_application_seeker_isolation_and_crud(client):
    # Create two seekers
    token_a = await create_user_and_token(client, "seeker.a@jobapptest.io", "Seeker A")
    token_b = await create_user_and_token(client, "seeker.b@jobapptest.io", "Seeker B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Seeker A creates an application
    app_payload = {
        "company": "TestStripe",
        "role": "Distributed Systems Engineer",
        "companyName": "TestStripe",
        "roleTitle": "Distributed Systems Engineer",
        "location": "San Francisco, CA",
        "appliedDate": "2026-09-01",
        "deadlineDate": "2026-09-20",
        "interviewDate": "2026-09-10 10:00",
        "recruiter": "Sarah Lin",
        "status": "Interview",
        "priority": "High",
        "notes": "Discussing Raft consensus.",
        "resume": "SeekerA_Resume.pdf",
        "salaryRange": "$190k - $220k",
        "matchScore": 94,
        "tags": ["Go", "Distributed Systems"],
    }

    create_res = await client.post("/api/applications", json=app_payload, headers=headers_a)
    assert create_res.status_code == 201
    app_a = create_res.json()
    app_id = app_a["id"]
    assert app_a["company"] == "TestStripe"
    assert app_a["status"] == "Interview"
    assert app_a["priority"] == "High"
    assert app_a["interviewDate"] == "2026-09-10 10:00"

    # Seeker A can read their own application
    get_res_a = await client.get(f"/api/applications/{app_id}", headers=headers_a)
    assert get_res_a.status_code == 200
    assert get_res_a.json()["id"] == app_id

    # Seeker B CANNOT read Seeker A's application (Strict Isolation)
    get_res_b = await client.get(f"/api/applications/{app_id}", headers=headers_b)
    assert get_res_b.status_code == 404

    # Seeker B CANNOT update Seeker A's application
    patch_res_b = await client.patch(f"/api/applications/{app_id}", json={"status": "Rejected"}, headers=headers_b)
    assert patch_res_b.status_code == 404

    # Seeker B CANNOT delete Seeker A's application
    del_res_b = await client.delete(f"/api/applications/{app_id}", headers=headers_b)
    assert del_res_b.status_code == 404

    # Seeker A CAN update their own application
    patch_res_a = await client.patch(f"/api/applications/{app_id}", json={"notes": "Final onsite cleared."}, headers=headers_a)
    assert patch_res_a.status_code == 200
    assert patch_res_a.json()["notes"] == "Final onsite cleared."

    # Seeker A CAN delete their own application
    del_res_a = await client.delete(f"/api/applications/{app_id}", headers=headers_a)
    assert del_res_a.status_code == 200
    assert del_res_a.json()["success"] is True


@pytest.mark.asyncio
async def test_application_queries_upcoming_and_stats(client):
    token = await create_user_and_token(client, "seeker.stats@jobapptest.io", "Stats Seeker")
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")
    past = (datetime.now(timezone.utc) - timedelta(days=10)).strftime("%Y-%m-%d")

    # 1. Interview with upcoming date
    await client.post("/api/applications", json={
        "company": "TestLinear",
        "role": "Sync Engineer",
        "status": "Interview",
        "priority": "High",
        "appliedDate": today,
        "deadlineDate": tomorrow,
        "interviewDate": f"{tomorrow} 14:00",
    }, headers=headers)

    # 2. Offer
    await client.post("/api/applications", json={
        "company": "TestDatadog",
        "role": "Platform Engineer",
        "status": "Offer",
        "priority": "High",
        "appliedDate": past,
    }, headers=headers)

    # 3. Applied with upcoming deadline
    await client.post("/api/applications", json={
        "company": "TestFigma",
        "role": "Systems Engineer",
        "status": "Applied",
        "priority": "Medium",
        "appliedDate": today,
        "deadlineDate": tomorrow,
    }, headers=headers)

    # 4. Rejected
    await client.post("/api/applications", json={
        "company": "TestGoogle",
        "role": "Search Engineer",
        "status": "Rejected",
        "priority": "Low",
        "appliedDate": past,
    }, headers=headers)

    # Test status query ?status=Interview
    res_interview = await client.get("/api/applications?status=Interview", headers=headers)
    assert res_interview.status_code == 200
    assert len(res_interview.json()) == 1
    assert res_interview.json()[0]["company"] == "TestLinear"

    # Test priority query ?priority=High
    res_priority = await client.get("/api/applications?priority=High", headers=headers)
    assert res_priority.status_code == 200
    assert len(res_priority.json()) == 2

    # Test upcoming query ?upcoming=true
    res_upcoming = await client.get("/api/applications?upcoming=true", headers=headers)
    assert res_upcoming.status_code == 200
    assert len(res_upcoming.json()) >= 2  # Linear (interview & deadline) and Figma (deadline)

    # Test stats aggregation GET /api/applications/stats
    stats_res = await client.get("/api/applications/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["totalApplications"] == 4
    assert stats["applied"] == 1
    assert stats["interviews"] == 1
    assert stats["offers"] == 1
    assert stats["rejected"] == 1
    assert stats["upcomingInterviews"] >= 1
    assert stats["upcomingDeadlines"] >= 2
