import uuid
import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as ac:
        yield ac
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@phase5test\\.io$"}})
        await db.learning_progress.delete_many({"userId": {"$regex": "^usr_phase5_.*"}})
        await db.progress.delete_many({"userId": {"$regex": "^usr_phase5_.*"}})
        await db.resume_analyses.delete_many({"userId": {"$regex": "^usr_phase5_.*"}})


async def register_user(client: httpx.AsyncClient, email: str, name: str) -> tuple[str, str]:
    res = await client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "SecurePassword123!", "role": "seeker"},
    )
    assert res.status_code == 201
    data = res.json()
    return data["user"]["id"], data["access_token"]


@pytest.mark.asyncio
async def test_list_courses_unauthenticated(client: httpx.AsyncClient):
    """Public course catalog access without auth header."""
    res = await client.get("/api/learning/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 16
    for c in courses:
        assert c["progress"] == 0.0
        assert c["isEnrolled"] is False
        assert "id" in c
        assert "title" in c
        assert "skillsCovered" in c


@pytest.mark.asyncio
async def test_list_courses_filtering(client: httpx.AsyncClient):
    """Filtering courses by category, difficulty, and search keyword."""
    # Category filter
    res = await client.get("/api/learning/courses", params={"category": "System Design"})
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) > 0
    assert all(c["category"] == "System Design" for c in courses)

    # Difficulty filter
    res = await client.get("/api/learning/courses", params={"difficulty": "Beginner"})
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) > 0
    assert all(c["difficulty"] == "Beginner" for c in courses)

    # Search filter
    res = await client.get("/api/learning/courses", params={"search": "Kafka"})
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) > 0
    assert any("Kafka" in c["title"] or "Kafka" in c["skillsCovered"] for c in courses)


@pytest.mark.asyncio
async def test_get_course_detail_found_and_not_found(client: httpx.AsyncClient):
    """Lookup course syllabus by ID."""
    # Existing course
    res = await client.get("/api/learning/courses/mod-1")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == "mod-1"
    assert len(detail["lessons"]) == 6
    assert detail["lessons"][0]["id"] == "mod-1-l1"
    assert "Kafka Architecture" in detail["lessons"][0]["title"]

    # Non-existent course
    res = await client.get("/api/learning/courses/mod-invalid-999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_enroll_course_authentication_and_idempotency(client: httpx.AsyncClient):
    """Enrollment requires auth and is idempotent."""
    # Unauthenticated
    res = await client.post("/api/learning/courses/mod-2/enroll")
    assert res.status_code == 401

    # Authenticated user
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student One")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # First enrollment
    res = await client.post("/api/learning/courses/mod-2/enroll", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["courseId"] == "mod-2"
    assert data["progressPercent"] == 0.0
    assert data["status"] == "in_progress"
    assert "Successfully enrolled" in data["message"]

    # Re-enroll (idempotent)
    res = await client.post("/api/learning/courses/mod-2/enroll", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["courseId"] == "mod-2"
    assert "Already enrolled" in data["message"]


@pytest.mark.asyncio
async def test_complete_lesson_deterministic_math(client: httpx.AsyncClient):
    """Progress percentage is calculated strictly by backend from completed lessons."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Math")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # mod-2 has 4 lessons (mod-2-l1, mod-2-l2, mod-2-l3, mod-2-l4)
    # Complete lesson 1 -> 1/4 = 25.0%
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l1/complete", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["progressPercent"] == 25.0
    assert data["status"] == "in_progress"
    assert "mod-2-l1" in data["completedLessons"]

    # Complete lesson 2 -> 2/4 = 50.0%
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l2/complete", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["progressPercent"] == 50.0
    assert len(data["completedLessons"]) == 2

    # Verify courses list reflects progress
    res = await client.get("/api/learning/courses", headers=auth_headers)
    assert res.status_code == 200
    courses = {c["id"]: c for c in res.json()}
    assert courses["mod-2"]["progress"] == 50.0
    assert courses["mod-2"]["isEnrolled"] is True
    assert courses["mod-2"]["completedLessonsCount"] == 2


@pytest.mark.asyncio
async def test_complete_lesson_idempotency(client: httpx.AsyncClient):
    """Completing the same lesson multiple times does not inflate progress."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Idempotent")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Complete lesson 1 first time
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l1/complete", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["progressPercent"] == 25.0

    # Complete lesson 1 second time
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l1/complete", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["progressPercent"] == 25.0
    assert len(res.json()["completedLessons"]) == 1


@pytest.mark.asyncio
async def test_complete_all_lessons_marks_completed(client: httpx.AsyncClient):
    """Completing all lessons in a course transitions status to completed with completedAt timestamp."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Finisher")
    auth_headers = {"Authorization": f"Bearer {token}"}

    for lid in ["mod-2-l1", "mod-2-l2", "mod-2-l3", "mod-2-l4"]:
        res = await client.post(f"/api/learning/courses/mod-2/lessons/{lid}/complete", headers=auth_headers)
        assert res.status_code == 200

    data = res.json()
    assert data["progressPercent"] == 100.0
    assert data["status"] == "completed"
    assert data["completedAt"] is not None


@pytest.mark.asyncio
async def test_uncomplete_lesson_and_reset(client: httpx.AsyncClient):
    """Uncompleting lessons reduces progress, and resetting clears progress to 0%."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Toggle")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Complete 2 lessons
    await client.post("/api/learning/courses/mod-2/lessons/mod-2-l1/complete", headers=auth_headers)
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l2/complete", headers=auth_headers)
    assert res.json()["progressPercent"] == 50.0

    # Uncomplete lesson 1
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-2-l1/uncomplete", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["progressPercent"] == 25.0
    assert "mod-2-l1" not in data["completedLessons"]
    assert "mod-2-l2" in data["completedLessons"]

    # Reset course
    res = await client.post("/api/learning/courses/mod-2/reset", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["progressPercent"] == 0.0
    assert data["completedLessons"] == []
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_invalid_lesson_and_course_validation(client: httpx.AsyncClient):
    """Invalid course or lesson ID returns 404."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Valid")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Lesson does not exist in course
    res = await client.post("/api/learning/courses/mod-2/lessons/mod-invalid-lesson/complete", headers=auth_headers)
    assert res.status_code == 404

    # Course does not exist
    res = await client.post("/api/learning/courses/mod-invalid-course/lessons/mod-1-l1/complete", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_multi_tenant_isolation(client: httpx.AsyncClient):
    """User A's progress is strictly isolated from User B."""
    uid_a = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    uid_b = f"usr_phase5_{uuid.uuid4().hex[:8]}"

    _, token_a = await register_user(client, f"{uid_a}@phase5test.io", "User A")
    _, token_b = await register_user(client, f"{uid_b}@phase5test.io", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A completes lessons in mod-1
    await client.post("/api/learning/courses/mod-1/lessons/mod-1-l1/complete", headers=headers_a)
    await client.post("/api/learning/courses/mod-1/lessons/mod-1-l2/complete", headers=headers_a)

    # User A views mod-1
    res_a = await client.get("/api/learning/courses/mod-1", headers=headers_a)
    assert res_a.json()["progress"] > 0
    assert res_a.json()["isEnrolled"] is True
    assert len(res_a.json()["completedLessons"]) == 2

    # User B views mod-1 -> must be 0 progress, not enrolled
    res_b = await client.get("/api/learning/courses/mod-1", headers=headers_b)
    assert res_b.json()["progress"] == 0.0
    assert res_b.json()["isEnrolled"] is False
    assert res_b.json()["completedLessons"] == []


@pytest.mark.asyncio
async def test_my_learning_summary_and_progress_overview(client: httpx.AsyncClient):
    """Real stats aggregation in /learning/my-progress and /progress/overview."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Summary")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Before activity
    res = await client.get("/api/learning/my-progress", headers=auth_headers)
    assert res.status_code == 200
    summary = res.json()
    assert summary["coursesEnrolled"] == 0
    assert summary["coursesCompleted"] == 0
    assert summary["lessonsCompleted"] == 0
    assert summary["totalStudyHours"] == 0.0

    # Complete all lessons of mod-2 (2.0 hrs, 4 lessons)
    for lid in ["mod-2-l1", "mod-2-l2", "mod-2-l3", "mod-2-l4"]:
        await client.post(f"/api/learning/courses/mod-2/lessons/{lid}/complete", headers=auth_headers)

    # After activity
    res = await client.get("/api/learning/my-progress", headers=auth_headers)
    assert res.status_code == 200
    summary = res.json()
    assert summary["coursesEnrolled"] == 1
    assert summary["coursesCompleted"] == 1
    assert summary["lessonsCompleted"] == 4
    assert summary["totalStudyHours"] == 2.0
    assert summary["streakDays"] >= 1

    # Check /progress/overview endpoint
    res = await client.get("/api/progress/overview", headers=auth_headers)
    assert res.status_code == 200
    overview = res.json()
    assert overview["coursesEnrolled"] == 1
    assert overview["coursesCompleted"] == 1
    assert overview["lessonsCompleted"] == 4
    assert overview["totalStudyHours"] == 2.0
    assert overview["codingStreakDays"] >= 1


@pytest.mark.asyncio
async def test_progress_activity_history(client: httpx.AsyncClient):
    """Activity history returns real data points after user completes lessons."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Activity")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Complete a lesson
    await client.post("/api/learning/courses/mod-1/lessons/mod-1-l1/complete", headers=auth_headers)

    # Fetch daily activity
    res = await client.get("/api/progress/activity", params={"range": "daily"}, headers=auth_headers)
    assert res.status_code == 200
    activity = res.json()
    assert len(activity) == 7
    assert any(pt["studyHours"] > 0 or pt["questionsSolved"] > 0 for pt in activity)


@pytest.mark.asyncio
async def test_uncomplete_on_unenrolled_course(client: httpx.AsyncClient):
    """Uncompleting on an unenrolled course returns 200 with 0% progress."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Fresh")
    auth_headers = {"Authorization": f"Bearer {token}"}

    res = await client.post("/api/learning/courses/mod-1/lessons/mod-1-l1/uncomplete", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["progressPercent"] == 0.0
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_progress_skill_trajectories(client: httpx.AsyncClient):
    """Progress skills endpoint returns dynamic trajectories based on learning progress."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    _, token = await register_user(client, f"{uid}@phase5test.io", "Student Skills")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Before learning -> empty list
    res = await client.get("/api/progress/skills", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []

    # Complete a lesson in Kafka course
    await client.post("/api/learning/courses/mod-1/lessons/mod-1-l1/complete", headers=auth_headers)

    # After learning -> skill trajectories populated
    res = await client.get("/api/progress/skills", headers=auth_headers)
    assert res.status_code == 200
    trajs = res.json()
    assert len(trajs) > 0
    assert any(t["name"] in ["Kafka", "Distributed Systems"] for t in trajs)


@pytest.mark.asyncio
async def test_recommendations_dynamic_from_resume_skill_gaps(client: httpx.AsyncClient):
    """Courses are dynamically recommended when covering candidate's resume skill gaps."""
    uid = f"usr_phase5_{uuid.uuid4().hex[:8]}"
    user_id, token = await register_user(client, f"{uid}@phase5test.io", "Student Gaps")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Insert a fake resume analysis with skill gaps in PostgreSQL and Redis
    db = DatabaseManager.db
    assert db is not None
    await db.resume_analyses.insert_one({
        "id": f"ana_test_{uuid.uuid4().hex[:8]}",
        "userId": user_id,
        "resumeId": "res-test-gap-1",
        "createdAt": "2026-09-06T00:00:00Z",
        "analysis": {
            "atsScore": 85,
            "skillGaps": ["PostgreSQL", "Redis"],
            "keyStrengths": ["Go", "Docker"],
        },
    })

    res = await client.get("/api/learning/courses", headers=auth_headers)
    assert res.status_code == 200
    courses = {c["id"]: c for c in res.json()}
    # mod-12 covers PostgreSQL -> must be recommended
    assert courses["mod-12"]["isRecommended"] is True
    assert "Closes Identified Skill Gap" in courses["mod-12"]["recommendationReason"]
    assert "PostgreSQL" in courses["mod-12"]["recommendationReason"]

