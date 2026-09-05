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
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.candidates.delete_many({})
        await db.recruiter_interactions.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@recruiter\\.io$"}})
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

    # If company specified, update user and profile document
    if company:
        from bson import ObjectId
        db = DatabaseManager.db
        id_q = {"$or": [{"id": user_id}, {"_id": ObjectId(user_id)}]} if ObjectId.is_valid(user_id) else {"id": user_id}
        await db.users.update_one(id_q, {"$set": {"company": company}})
        await db.profiles.update_one({"userId": user_id}, {"$set": {"company": company}}, upsert=True)

    return user_id, token


@pytest.mark.asyncio
async def test_recruiter_rbac_authorization(client):
    # Register Seeker and Recruiter
    _, seeker_token = await register_user(client, "seeker.bob@recruiter.io", "Bob Seeker", role="seeker")
    _, recruiter_token = await register_user(client, "recruiter.sarah@recruiter.io", "Sarah Recruiter", role="recruiter")

    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 1. Seeker attempting to access recruiter candidates -> 403 Forbidden
    res_list = await client.get("/api/recruiter/candidates", headers=seeker_headers)
    assert res_list.status_code == 403

    # 2. Seeker attempting to get specific candidate -> 403 Forbidden
    res_get = await client.get("/api/recruiter/candidates/cand-1", headers=seeker_headers)
    assert res_get.status_code == 403

    # 3. Seeker attempting to shortlist -> 403 Forbidden
    res_shortlist = await client.post("/api/recruiter/candidates/cand-1/shortlist", headers=seeker_headers)
    assert res_shortlist.status_code == 403

    # 4. Recruiter access succeeds -> 200 OK
    res_recruiter = await client.get("/api/recruiter/candidates", headers=recruiter_headers)
    assert res_recruiter.status_code == 200
    assert len(res_recruiter.json()) > 0


@pytest.mark.asyncio
async def test_candidate_filtering_and_search(client):
    _, token = await register_user(client, "filter.recruiter@recruiter.io", "Filter Recruiter", role="recruiter")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Search by name
    res_search = await client.get("/api/recruiter/candidates?search=Rivera", headers=headers)
    assert res_search.status_code == 200
    candidates = res_search.json()
    assert len(candidates) == 1
    assert candidates[0]["name"] == "Alex Rivera"

    # 2. Filter by skill Kafka
    res_skill = await client.get("/api/recruiter/candidates?skills=Kafka", headers=headers)
    assert res_skill.status_code == 200
    kafka_cands = res_skill.json()
    assert all("Kafka" in c["skills"] for c in kafka_cands)

    # 3. Filter by experienceLevel Senior
    res_exp = await client.get("/api/recruiter/candidates?experienceLevel=Senior", headers=headers)
    assert res_exp.status_code == 200
    seniors = res_exp.json()
    assert all(c["experienceLevel"] == "Senior" for c in seniors)

    # 4. Filter by minJobMatch 92
    res_match = await client.get("/api/recruiter/candidates?jobMatch=92", headers=headers)
    assert res_match.status_code == 200
    high_matches = res_match.json()
    assert all(c["jobMatch"] >= 92 for c in high_matches)

    # 5. Filter by minAssessmentScore 95
    res_score = await client.get("/api/recruiter/candidates?assessmentScore=95", headers=headers)
    assert res_score.status_code == 200
    top_performers = res_score.json()
    assert all(c["assessmentScore"] >= 95 for c in top_performers)


@pytest.mark.asyncio
async def test_candidate_privacy_undiscoverable_and_redaction(client):
    _, token = await register_user(client, "privacy.recruiter@recruiter.io", "Privacy Recruiter", role="recruiter")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Candidate Rachel Green (cand-7) has searchStatus == "not_looking"
    list_res = await client.get("/api/recruiter/candidates", headers=headers)
    assert list_res.status_code == 200
    all_cands = list_res.json()
    # cand-7 must NEVER be discoverable in recruiter candidate pool
    assert not any(c["id"] == "cand-7" for c in all_cands)

    # Direct access to cand-7 returns 404 Not Found
    cand7_res = await client.get("/api/recruiter/candidates/cand-7", headers=headers)
    assert cand7_res.status_code == 404

    # 2. Devin Chen (cand-3) has showSalary == False
    cand3_res = await client.get("/api/recruiter/candidates/cand-3", headers=headers)
    assert cand3_res.status_code == 200
    cand3 = cand3_res.json()
    assert cand3["privacy"]["salaryExpectation"] in [None, "[Undisclosed by Candidate]"]

    # 3. Sophia Patel (cand-4) has contactVisibility == "hidden"
    cand4_res = await client.get("/api/recruiter/candidates/cand-4", headers=headers)
    assert cand4_res.status_code == 200
    cand4 = cand4_res.json()
    assert cand4["privacy"]["email"] in [None, "[Contact Hidden by Candidate]"]
    assert cand4["privacy"]["phone"] is None


@pytest.mark.asyncio
async def test_candidate_employer_cloaking(client):
    # cand-1 (Alex Rivera) has currentEmployer: 'CloudScale' and cloakedFromCurrentEmployer: True
    # Recruiter A works at CloudScale
    _, token_cloudscale = await register_user(
        client,
        "recruiter.cloudscale@recruiter.io",
        "CloudScale Recruiter",
        role="recruiter",
        company="CloudScale",
    )
    # Recruiter B works at Stripe
    _, token_stripe = await register_user(
        client,
        "recruiter.stripe@recruiter.io",
        "Stripe Recruiter",
        role="recruiter",
        company="Stripe",
    )

    headers_cloudscale = {"Authorization": f"Bearer {token_cloudscale}"}
    headers_stripe = {"Authorization": f"Bearer {token_stripe}"}

    # 1. CloudScale recruiter listing candidates: cand-1 MUST be cloaked and excluded
    cloudscale_list = (await client.get("/api/recruiter/candidates", headers=headers_cloudscale)).json()
    assert not any(c["id"] == "cand-1" for c in cloudscale_list)

    # 2. CloudScale recruiter accessing cand-1 directly: returns 404 Not Found
    cloudscale_direct = await client.get("/api/recruiter/candidates/cand-1", headers=headers_cloudscale)
    assert cloudscale_direct.status_code == 404

    # 3. Stripe recruiter listing candidates: cand-1 is visible
    stripe_list = (await client.get("/api/recruiter/candidates", headers=headers_stripe)).json()
    assert any(c["id"] == "cand-1" for c in stripe_list)

    # 4. Stripe recruiter accessing cand-1 directly: returns 200 OK
    stripe_direct = await client.get("/api/recruiter/candidates/cand-1", headers=headers_stripe)
    assert stripe_direct.status_code == 200
    assert stripe_direct.json()["name"] == "Alex Rivera"


@pytest.mark.asyncio
async def test_per_recruiter_shortlist_and_interview_stage(client):
    _, token_a = await register_user(client, "recruiter.a@recruiter.io", "Recruiter A", role="recruiter")
    _, token_b = await register_user(client, "recruiter.b@recruiter.io", "Recruiter B", role="recruiter")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Recruiter A shortlists cand-2 (Elena Rostova)
    shortlist_res = await client.post("/api/recruiter/candidates/cand-2/shortlist", headers=headers_a)
    assert shortlist_res.status_code == 200
    assert shortlist_res.json()["isShortlisted"] is True

    # Recruiter A updates interview stage to "Technical Onsite"
    stage_res = await client.patch(
        "/api/recruiter/candidates/cand-2/stage",
        json={"stage": "Technical Onsite", "notes": "Impressive open source portfolio."},
        headers=headers_a,
    )
    assert stage_res.status_code == 200
    assert stage_res.json()["interviewStage"] == "Technical Onsite"

    # Verify Recruiter A sees shortlist and updated stage
    view_a = (await client.get("/api/recruiter/candidates/cand-2", headers=headers_a)).json()
    assert view_a["isShortlisted"] is True
    assert view_a["interviewStage"] == "Technical Onsite"

    # Verify Recruiter B views cand-2: does NOT see Recruiter A's shortlist or stage (isolated!)
    view_b = (await client.get("/api/recruiter/candidates/cand-2", headers=headers_b)).json()
    assert view_b["isShortlisted"] is False
    assert view_b["interviewStage"] == "Not Started"

    # Recruiter A unshortlists cand-2
    unshortlist_res = await client.delete("/api/recruiter/candidates/cand-2/shortlist", headers=headers_a)
    assert unshortlist_res.status_code == 200
    assert unshortlist_res.json()["isShortlisted"] is False

    # Verify Recruiter A sees isShortlisted == False
    view_a_after = (await client.get("/api/recruiter/candidates/cand-2", headers=headers_a)).json()
    assert view_a_after["isShortlisted"] is False
