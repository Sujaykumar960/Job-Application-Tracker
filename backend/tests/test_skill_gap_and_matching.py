import io
import uuid
import httpx
import pytest
import pytest_asyncio
from reportlab.pdfgen import canvas

from app.database import DatabaseManager
from app.main import app
from app.services.matching_service import (
    calculate_job_match,
    extract_skills_from_text,
    get_display_name,
    normalize_skill,
)


def generate_test_pdf_bytes(text: str) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Education: BS Computer Science, Stanford University, 2024")
    c.drawString(72, 710, "Experience: Built backend microservices and streaming pipelines.")
    c.save()
    return buffer.getvalue()


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as ac:
        yield ac
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@phase4test\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": "^usr_phase4_.*"}})
        await db.resumes.delete_many({"userId": {"$regex": "^usr_phase4_.*"}})
        await db.resume_analyses.delete_many({"userId": {"$regex": "^usr_phase4_.*"}})
        await db.jobs.delete_many({"title": {"$regex": "^Test Phase 4 .*"}})


async def register_user(client: httpx.AsyncClient, email: str, name: str) -> tuple[str, str]:
    res = await client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "SecurePassword123!", "role": "seeker"},
    )
    assert res.status_code == 201
    data = res.json()
    return data["user"]["id"], data["access_token"]


async def create_test_job(client: httpx.AsyncClient, recruiter_token: str, title: str, skills: list[str]) -> str:
    res = await client.post(
        "/api/jobs",
        json={
            "title": title,
            "company": "Phase4 Tech Corp",
            "location": "San Francisco, CA (Remote)",
            "workType": "Remote",
            "experienceLevel": "Mid",
            "skills": [{"name": s} for s in skills],
            "requiredSkills": skills,
            "description": f"Target engineering position requiring {', '.join(skills)}.",
        },
        headers={"Authorization": f"Bearer {recruiter_token}"},
    )
    assert res.status_code == 201
    return res.json()["id"]


# ============================================================================
# 1. UNIT TESTS: SKILL NORMALIZATION & DETERMINISTIC MATCHING
# ============================================================================

def test_skill_normalization_aliases():
    """Verify alias mapping and canonical resolution."""
    assert normalize_skill("golang") == "go"
    assert normalize_skill("k8s") == "kubernetes"
    assert normalize_skill("postgres") == "postgresql"
    assert normalize_skill("postgres db") == "postgresql"
    assert normalize_skill("react.js") == "react"
    assert normalize_skill("reactjs") == "react"
    assert normalize_skill("node.js") == "node.js"
    assert normalize_skill("nodejs") == "node.js"
    assert normalize_skill("py") == "python"
    assert normalize_skill("python3") == "python"
    assert normalize_skill("amazon web services") == "aws"


def test_skill_normalization_case_and_punctuation():
    """Verify case-insensitivity and punctuation trimming."""
    assert normalize_skill("  DOCKER  ") == "docker"
    assert normalize_skill("Docker!") == "docker"
    assert normalize_skill("C++") == "c++"
    assert normalize_skill("TypeScript") == "typescript"


def test_get_display_name():
    """Verify human-readable canonical display names."""
    assert get_display_name("go") == "Go (Golang)"
    assert get_display_name("postgresql") == "PostgreSQL"
    assert get_display_name("kubernetes") == "Kubernetes"
    assert get_display_name("aws") == "AWS"


def test_extract_skills_from_text():
    """Verify text keyword scanning across raw descriptions."""
    text = "We are seeking a Backend Engineer with Go, Kafka, and Docker experience deploying to AWS."
    skills = extract_skills_from_text(text)
    assert "go" in skills
    assert "kafka" in skills
    assert "docker" in skills
    assert "aws" in skills


def test_deterministic_job_match_zero_skills():
    """Candidate with zero skills should receive lowest bounded score and all required skills missing."""
    job = {
        "id": "job-1",
        "title": "Distributed Systems Engineer",
        "company": "Cloud Corp",
        "skills": [{"name": "Go"}, {"name": "Kafka"}, {"name": "Kubernetes"}, {"name": "PostgreSQL"}],
        "requiredSkills": ["Go", "Kafka", "Kubernetes", "PostgreSQL"],
        "experienceLevel": "Senior",
        "workType": "On-site",
        "location": "New York, NY",
    }
    result = calculate_job_match(
        candidate_skills=set(),
        job=job,
        candidate_exp="Junior",
        candidate_loc="Remote",
    )
    assert result["overallScore"] >= 0
    assert result["overallScore"] <= 20  # strictly bounded low score
    assert len(result["matchedSkills"]) == 0
    assert len(result["missingSkills"]) == 4


def test_deterministic_job_match_perfect_match():
    """Candidate with 100% skill overlap, matching experience and location should achieve 100% score."""
    job = {
        "id": "job-2",
        "title": "Go Backend Developer",
        "company": "Stream Tech",
        "skills": [{"name": "Go"}, {"name": "PostgreSQL"}, {"name": "Redis"}],
        "requiredSkills": ["Go", "PostgreSQL", "Redis"],
        "experienceLevel": "Mid",
        "workType": "Remote",
        "location": "Remote",
    }
    candidate_skills = {"go", "postgresql", "redis"}
    result = calculate_job_match(
        candidate_skills=candidate_skills,
        job=job,
        candidate_exp="Mid",
        candidate_loc="Remote",
    )
    assert result["overallScore"] == 100
    assert len(result["matchedSkills"]) == 3
    assert len(result["missingSkills"]) == 0
    assert len(result["recommendations"]) >= 1


def test_partial_skill_detection():
    """If candidate has Docker and job requires Kubernetes, it should detect partial skill."""
    job = {
        "id": "job-3",
        "title": "Cloud Infrastructure Engineer",
        "company": "Kube Tech",
        "skills": [{"name": "Kubernetes"}],
        "requiredSkills": ["Kubernetes"],
        "experienceLevel": "Mid",
        "workType": "Remote",
    }
    candidate_skills = {"docker"}  # has related skill
    result = calculate_job_match(
        candidate_skills=candidate_skills,
        job=job,
        candidate_exp="Mid",
        candidate_loc="Remote",
    )
    assert len(result["partialSkills"]) == 1
    assert result["partialSkills"][0]["name"] == "Kubernetes"
    assert "Docker" in result["partialSkills"][0]["note"]


def test_deterministic_reproducibility():
    """Score must be completely deterministic and identical across repeated evaluations."""
    job = {
        "id": "job-4",
        "title": "Fullstack Engineer",
        "company": "App Corp",
        "skills": [{"name": "React"}, {"name": "TypeScript"}, {"name": "Node.js"}, {"name": "GraphQL"}],
        "requiredSkills": ["React", "TypeScript", "Node.js", "GraphQL"],
        "experienceLevel": "Mid",
        "workType": "Hybrid",
        "location": "San Francisco",
    }
    candidate_skills = {"react", "typescript"}
    scores = [
        calculate_job_match(candidate_skills, job, "Mid", "San Francisco")["overallScore"]
        for _ in range(5)
    ]
    assert len(set(scores)) == 1  # All 5 scores must be strictly identical


# ============================================================================
# 2. INTEGRATION TESTS: AUTH & SECURITY ENFORCEMENT
# ============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected(client):
    """Endpoints must reject unauthenticated requests with 401 Unauthorized."""
    # 1. Skill Gap
    res = await client.get("/api/skill-gap")
    assert res.status_code == 401

    # 2. Custom Skill Gap
    res = await client.post("/api/skill-gap/custom", json={"jobDescription": "FastAPI, PostgreSQL"})
    assert res.status_code == 401

    # 3. Job Match
    res = await client.post("/api/jobs/dummy-id/match")
    assert res.status_code == 401

    # 4. Job Matches List
    res = await client.get("/api/jobs/matches")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_empty_database_skill_gap(client):
    """A new user with zero resumes and zero skills receives clean empty state without crashing."""
    uid, token = await register_user(client, "empty.phase4@phase4test.io", "Empty Phase4 User")
    headers = {"Authorization": f"Bearer {token}"}

    # Clear initial registration profile skills to test pure 0-skills condition
    await DatabaseManager.db.profiles.update_one({"userId": uid}, {"$set": {"skills": []}})

    res = await client.get("/api/skill-gap", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["hasActiveResume"] is False
    assert data["hasProfileSkills"] is False
    assert data["summary"]["totalProfileSkills"] == 0
    assert data["message"] is not None


@pytest.mark.asyncio
async def test_skill_gap_analysis_with_resume_and_profile(client):
    """User with uploaded resume and profile skills receives complete populated radar and gaps."""
    uid, token = await register_user(client, "active.phase4@phase4test.io", "Active Candidate")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload resume containing Go, Kafka, Docker, Redis
    pdf_bytes = generate_test_pdf_bytes(
        "Candidate Backend Resume. Skills: Go, Kafka, Docker, Redis, PostgreSQL, Microservices."
    )
    upload_res = await client.post(
        "/api/resumes/upload",
        files={"file": ("Resume.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 201

    # Fetch skill gap matrix
    res = await client.get("/api/skill-gap?track=distributed", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["hasActiveResume"] is True
    assert data["summary"]["totalProfileSkills"] >= 4
    assert len(data["radarData"]) == 6
    assert len(data["categoryProficiency"]) == 6
    assert len(data["currentSkills"]) >= 4

    # Verify track switching works
    res_backend = await client.get("/api/skill-gap?track=backend", headers=headers)
    assert res_backend.status_code == 200
    assert res_backend.json()["targetTrack"] == "backend"


@pytest.mark.asyncio
async def test_custom_job_match_evaluation(client):
    """Evaluating custom pasted job description against authenticated user skills."""
    uid, token = await register_user(client, "custom.match@phase4test.io", "Custom Matcher")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload resume with Python and FastAPI
    pdf_bytes = generate_test_pdf_bytes("Fullstack Python Developer. Skills: Python, FastAPI, PostgreSQL, Git.")
    await client.post(
        "/api/resumes/upload",
        files={"file": ("Resume.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )

    # Missing text should trigger 400
    res_bad = await client.post("/api/skill-gap/custom", json={"jobDescription": ""}, headers=headers)
    assert res_bad.status_code == 400

    # Valid custom job description
    res_custom = await client.post(
        "/api/skill-gap/custom",
        json={
            "jobDescription": "Looking for a Python and FastAPI backend developer with Kubernetes and AWS experience.",
            "jobTitle": "Lead Python Engineer",
            "companyName": "FastAPI Labs",
        },
        headers=headers,
    )
    assert res_custom.status_code == 200
    match_data = res_custom.json()
    assert match_data["overallScore"] > 0
    assert "Python" in match_data["matchedSkills"]
    assert "FastAPI" in match_data["matchedSkills"]


@pytest.mark.asyncio
async def test_job_match_and_matches_list(client):
    """Test POST /api/jobs/{job_id}/match and GET /api/jobs/matches ranking."""
    # Register recruiter to post job
    rec_res = await client.post(
        "/api/auth/register",
        json={"name": "Tech Recruiter", "email": "recruiter.p4@phase4test.io", "password": "SecurePassword123!", "role": "recruiter"},
    )
    assert rec_res.status_code == 201
    rec_token = rec_res.json()["access_token"]

    # Create job requiring Go and Kafka
    job_id = await create_test_job(client, rec_token, "Test Phase 4 Go Engineer", ["Go", "Kafka", "PostgreSQL"])

    # Register candidate with Go and PostgreSQL
    uid, cand_token = await register_user(client, "candidate.p4@phase4test.io", "Candidate P4")
    headers = {"Authorization": f"Bearer {cand_token}"}
    pdf_bytes = generate_test_pdf_bytes("Backend Go Dev. Skills: Go, PostgreSQL, Redis.")
    await client.post(
        "/api/resumes/upload",
        files={"file": ("Resume.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )

    # 1. POST /api/jobs/{job_id}/match for non-existent job -> 404
    non_existent = await client.post("/api/jobs/non-existent-id/match", headers=headers)
    assert non_existent.status_code == 404

    # 2. POST /api/jobs/{job_id}/match for real job
    match_res = await client.post(f"/api/jobs/{job_id}/match", headers=headers)
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert match_data["overallScore"] > 0
    assert "Go (Golang)" in match_data["matchedSkills"]
    assert "PostgreSQL" in match_data["matchedSkills"]
    # Kafka is missing
    missing_names = [m["name"] if isinstance(m, dict) else m for m in match_data["missingSkills"]]
    assert any("Kafka" in name for name in missing_names)

    # 3. GET /api/jobs/matches returns list ranked by matchScore
    matches_res = await client.get("/api/jobs/matches?limit=10", headers=headers)
    assert matches_res.status_code == 200
    ranked_jobs = matches_res.json()
    assert len(ranked_jobs) > 0
    assert ranked_jobs[0]["matchScore"] >= ranked_jobs[-1]["matchScore"]


@pytest.mark.asyncio
async def test_multi_tenant_resume_matching_isolation(client):
    """User A cannot use or expose User B's resume during match diagnostics."""
    # Register User A and upload User A's resume with Go
    uid_a, token_a = await register_user(client, "user_a.p4@phase4test.io", "User A")
    pdf_a = generate_test_pdf_bytes("User A Resume. Skills: Go, Kubernetes, Terraform.")
    res_a = await client.post(
        "/api/resumes/upload",
        files={"file": ("ResumeA.pdf", pdf_a, "application/pdf")},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    user_a_resume_id = res_a.json()["id"]

    # Register User B with Python only
    uid_b, token_b = await register_user(client, "user_b.p4@phase4test.io", "User B")
    pdf_b = generate_test_pdf_bytes("User B Resume. Skills: Python, Django.")
    await client.post(
        "/api/resumes/upload",
        files={"file": ("ResumeB.pdf", pdf_b, "application/pdf")},
        headers={"Authorization": f"Bearer {token_b}"},
    )

    # User B attempts to evaluate matching using User A's resumeId
    # The matching engine must NOT use User A's resume (must fall back to User B's active resume or fail securely)
    res_match_b = await client.post(
        "/api/skill-gap/custom",
        json={
            "jobDescription": "Need Go and Kubernetes engineer.",
            "resumeId": user_a_resume_id,
        },
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_match_b.status_code == 200
    data_b = res_match_b.json()
    # User B's matched skills must NOT contain User A's skills (Go, Kubernetes)
    assert "Go (Golang)" not in data_b["matchedSkills"]
    assert "Kubernetes" not in data_b["matchedSkills"]
