import pytest
import pytest_asyncio
import httpx

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.jobs.delete_many({"title": {"$regex": ".*SearchTest.*"}})
        await db.posts.delete_many({"content": {"$regex": ".*SearchTest.*"}})
        await db.candidates.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@searchtest\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker", company: str = "") -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]

    if company:
        from bson import ObjectId
        db = DatabaseManager.db
        id_q = {"$or": [{"id": user_id}, {"_id": ObjectId(user_id)}]} if ObjectId.is_valid(user_id) else {"id": user_id}
        await db.users.update_one(id_q, {"$set": {"company": company}})
        await db.profiles.update_one({"userId": user_id}, {"$set": {"company": company}}, upsert=True)

    return user_id, token


@pytest.mark.asyncio
async def test_empty_search_query(client):
    res = await client.get("/api/search?q=")
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == ""
    assert data["counts"]["total"] == 0
    assert data["results"]["jobs"] == []
    assert data["results"]["people"] == []
    assert data["results"]["posts"] == []
    assert data["results"]["candidates"] == []


@pytest.mark.asyncio
async def test_multidomain_search(client):
    db = DatabaseManager.db

    # 1. Insert search test job
    await db.jobs.insert_one({
        "title": "SearchTest Go Distributed Systems Engineer",
        "company": "Stripe",
        "location": "Seattle, WA",
        "workType": "Hybrid",
        "jobType": "Full-time",
        "skills": ["Go", "Kafka", "PostgreSQL"],
        "description": "Work on Go scale infrastructure at Stripe.",
        "createdAt": "2026-09-01T10:00:00Z",
    })

    # 2. Insert search test person profile
    await db.profiles.insert_one({
        "userId": "usr_search_go_dev",
        "name": "Alex SearchTest",
        "headline": "Senior Go Systems Engineer",
        "company": "Linear",
        "location": "San Francisco, CA",
        "skills": ["Go", "Kubernetes", "gRPC"],
        "atsScore": 92,
    })

    # 3. Insert search test post
    await db.posts.insert_one({
        "type": "Technical Discussion",
        "content": "SearchTest deep dive into Go channel concurrency and distributed actors.",
        "tags": ["Go", "Distributed"],
        "author": {"id": "usr_author_1", "name": "Sarah Go"},
        "createdAt": "2026-09-02T12:00:00Z",
        "likesCount": 15,
        "commentsCount": 4,
    })

    res = await client.get("/api/search?q=SearchTest")
    assert res.status_code == 200
    data = res.json()

    assert data["counts"]["jobs"] >= 1
    assert data["counts"]["people"] >= 1
    assert data["counts"]["posts"] >= 1
    assert data["counts"]["total"] >= 3

    assert any("Go Distributed Systems Engineer" in j["title"] for j in data["results"]["jobs"])
    assert any("Alex SearchTest" in p["name"] for p in data["results"]["people"])
    assert any("SearchTest deep dive" in post["content"] for post in data["results"]["posts"])


@pytest.mark.asyncio
async def test_type_specific_filtering(client):
    db = DatabaseManager.db

    await db.jobs.insert_one({
        "title": "SearchTest Kafka Platform Architect",
        "company": "Datadog",
        "location": "Remote",
        "skills": ["Kafka", "Go"],
    })

    await db.profiles.insert_one({
        "userId": "usr_kafka_dev",
        "name": "Jordan SearchTest",
        "headline": "Kafka Streaming Architect",
        "company": "Netflix",
        "skills": ["Kafka"],
    })

    # Query only jobs
    res_jobs = await client.get("/api/search?q=SearchTest&type=jobs")
    assert res_jobs.status_code == 200
    data_jobs = res_jobs.json()
    assert data_jobs["counts"]["jobs"] >= 1
    assert data_jobs["counts"]["people"] == 0
    assert data_jobs["counts"]["posts"] == 0
    assert len(data_jobs["results"]["jobs"]) >= 1
    assert len(data_jobs["results"]["people"]) == 0

    # Query only people
    res_people = await client.get("/api/search?q=SearchTest&type=people")
    assert res_people.status_code == 200
    data_people = res_people.json()
    assert data_people["counts"]["people"] >= 1
    assert data_people["counts"]["jobs"] == 0
    assert len(data_people["results"]["people"]) >= 1
    assert len(data_people["results"]["jobs"]) == 0


@pytest.mark.asyncio
async def test_recruiter_candidate_search_privacy(client):
    # Candidate Alex Rivera (cand-1) is in seed candidates:
    # currentEmployer: 'CloudScale', cloakedFromCurrentEmployer: True

    # 1. Seeker user search: candidates bucket MUST be empty
    _, seeker_token = await register_user(client, "seeker.search@searchtest.io", "Seeker Search", role="seeker")
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    seeker_res = await client.get("/api/search?q=Rivera", headers=seeker_headers)
    assert seeker_res.status_code == 200
    assert seeker_res.json()["counts"]["candidates"] == 0
    assert seeker_res.json()["results"]["candidates"] == []

    # 2. Recruiter from Stripe (different company): can discover candidate
    _, stripe_token = await register_user(client, "recruiter.stripe@searchtest.io", "Stripe Recruiter", role="recruiter", company="Stripe")
    stripe_headers = {"Authorization": f"Bearer {stripe_token}"}
    stripe_res = await client.get("/api/search?q=Rivera", headers=stripe_headers)
    assert stripe_res.status_code == 200
    assert stripe_res.json()["counts"]["candidates"] >= 1
    assert any(c["name"] == "Alex Rivera" for c in stripe_res.json()["results"]["candidates"])

    # 3. Recruiter from CloudScale (candidate's current employer): candidate is cloaked!
    _, cs_token = await register_user(client, "recruiter.cs@searchtest.io", "CloudScale Recruiter", role="recruiter", company="CloudScale")
    cs_headers = {"Authorization": f"Bearer {cs_token}"}
    cs_res = await client.get("/api/search?q=Rivera", headers=cs_headers)
    assert cs_res.status_code == 200
    assert not any(c["name"] == "Alex Rivera" for c in cs_res.json()["results"]["candidates"])
