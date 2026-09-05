import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.repositories.application_repository import ApplicationRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.job_repository import JobRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.post_repository import PostRepository
from app.schemas.application import ApplicationFilterQuery
from app.schemas.job import JobFilterQuery
from app.schemas.notification import NotificationFilterQuery
from app.schemas.recruiter import CandidateFilterQuery


@pytest_asyncio.fixture
async def db():
    await DatabaseManager.connect()
    test_db = DatabaseManager.db
    yield test_db
    if test_db is not None:
        await test_db.test_jobs.drop()
        await test_db.test_apps.drop()
        await test_db.test_posts.drop()
        await test_db.test_notifs.drop()
        await test_db.test_convs.drop()
        await test_db.test_msgs.drop()
        await test_db.test_cands.drop()
        await test_db.test_recruiter_interactions.drop()


@pytest.mark.asyncio
async def test_job_repository_flow(db):
    repo = JobRepository(db)
    repo.collection = db.test_jobs

    # 1. Create a job
    job = await repo.create({
        "title": "Principal Distributed Systems Engineer",
        "company": "Stripe",
        "location": "Remote",
        "salaryRange": "$200,000 - $240,000",
        "salaryMax": 240000,
        "skills": [{"name": "Go", "isMatched": False}, {"name": "Kafka", "isMatched": False}],
        "requiredSkills": ["Go", "Kafka"],
        "description": "Build high-throughput ledger services.",
        "isActive": True,
        "postedDate": "2026-09-01",
    })
    assert job["id"] is not None

    # 2. Search jobs with candidate skills to verify dynamic match computation
    query = JobFilterQuery(search="Stripe", sortBy="salary")
    results = await repo.search_jobs(query, candidate_skills=["Go"])
    assert len(results) >= 1
    target = next(j for j in results if j["id"] == job["id"])
    go_skill = next(s for s in target["skills"] if s["name"] == "Go")
    kafka_skill = next(s for s in target["skills"] if s["name"] == "Kafka")
    assert go_skill["isMatched"] is True
    assert kafka_skill["isMatched"] is False


@pytest.mark.asyncio
async def test_application_repository_flow(db):
    repo = ApplicationRepository(db)
    repo.collection = db.test_apps

    # Create application
    app = await repo.create({
        "userId": "usr_test_applicant",
        "company": "Linear",
        "role": "Product Engineer",
        "status": "Interview",
        "priority": "High",
        "appliedDate": "2026-09-02",
        "deadline": "2026-09-20",
    })
    assert app["id"] is not None

    # Query with status filter
    filter_q = ApplicationFilterQuery(status="Interview")
    apps = await repo.get_user_applications("usr_test_applicant", filter_q)
    assert len(apps) >= 1
    assert apps[0]["company"] == "Linear"


@pytest.mark.asyncio
async def test_post_repository_flow(db):
    repo = PostRepository(db)
    repo.collection = db.test_posts

    # Create post
    post = await repo.create({
        "authorId": "usr_alex",
        "author": {"name": "Alex", "headline": "Dev", "isVerified": True},
        "type": "Technical Discussion",
        "content": "Designing atomic sliding-window rate limiters...",
        "tags": ["Redis", "DistributedSystems"],
        "likes": [],
        "bookmarks": [],
        "comments": [],
    })
    pid = post["id"]

    # Toggle like
    like_res = await repo.toggle_like(pid, "usr_elena")
    assert like_res["isLiked"] is True
    assert like_res["likesCount"] == 1

    # Add comment
    comment = await repo.add_comment(pid, {
        "authorName": "Marcus",
        "authorHeadline": "SRE",
        "content": "Spot on!",
    })
    assert comment["content"] == "Spot on!"

    # Get feed view
    feed = await repo.get_feed(viewing_user_id="usr_elena")
    feed_post = next(p for p in feed if p["id"] == pid)
    assert feed_post["isLiked"] is True
    assert feed_post["commentsCount"] == 1


@pytest.mark.asyncio
async def test_notification_repository_flow(db):
    repo = NotificationRepository(db)
    repo.collection = db.test_notifs

    # Create notification
    notif = await repo.create({
        "userId": "usr_notif_target",
        "category": "interview_reminder",
        "title": "Onsite Round 1",
        "description": "Starting in 30 mins",
        "isRead": False,
        "priority": "urgent",
    })
    assert notif["id"] is not None

    # Query
    filter_q = NotificationFilterQuery(isRead=False)
    notifs = await repo.get_user_notifications("usr_notif_target", filter_q)
    assert len(notifs) >= 1

    # Mark all read
    modified = await repo.mark_all_read("usr_notif_target")
    assert modified >= 1


@pytest.mark.asyncio
async def test_candidate_repository_and_shortlist_flow(db):
    repo = CandidateRepository(db)
    repo.collection = db.test_cands
    repo.interactions_repo.collection = db.test_recruiter_interactions

    # Create candidate
    cand = await repo.create({
        "userId": "usr_cand_1",
        "name": "Alex Rivera",
        "role": "Distributed Systems Engineer",
        "location": "Seattle, WA",
        "experienceLevel": "Mid Level",
        "skills": ["Go", "Kafka"],
        "assessmentScore": 94,
        "jobMatch": 92,
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$180,000",
            "contactVisibility": "hidden",
            "email": "alex@devmail.io",
            "phone": "+1 555-0199",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "CloudScale",
        },
    })
    cid = cand["id"]

    # Search candidates with recruiter context
    query = CandidateFilterQuery(role="Distributed Systems")
    results = await repo.search_candidates(query, recruiter_id="rec_stripe_1", recruiter_company="Stripe")
    assert len(results) >= 1
    found = next(c for c in results if c["id"] == cid)
    assert found["privacy"]["email"] == "[Contact Hidden by Candidate]"
    assert found["isShortlisted"] is False

    # Shortlist candidate
    shortlisted = await repo.toggle_shortlist("rec_stripe_1", cid)
    assert shortlisted is True

    # Update interview stage
    interaction = await repo.update_interview_stage("rec_stripe_1", cid, "Technical Onsite", "Strong performance")
    assert interaction["interviewStage"] == "Technical Onsite"
