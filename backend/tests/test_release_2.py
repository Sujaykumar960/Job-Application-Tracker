import pytest
import pytest_asyncio
import httpx
from datetime import datetime, timezone

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
        await db.applications.delete_many({"company": {"$regex": "^R2Test.*"}})
        await db.notes.delete_many({"content": {"$regex": "^.*R2Test.*$"}})
        await db.users.delete_many({"email": {"$regex": ".*@r2test\\.io$"}})
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
async def test_ja05_application_notes_crud_and_validation(client):
    """
    JA-05: Add short notes to any application (recruiter name, feedback, etc.) and see them later.
    Constraint 2: Empty notes are rejected (400), cannot add note to non-existent application (404).
    Database: Note table supports one Application -> many Notes.
    """
    token_a = await create_user_and_token(client, "alice.notes@r2test.io", "Alice Notes")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Create an application for Alice
    app_res = await client.post("/api/applications", json={
        "company": "R2TestGoogle",
        "role": "Software Engineer",
        "status": "Applied",
        "priority": "High",
    }, headers=headers_a)
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # 2. Constraint validation: empty note rejected with 400 Bad Request
    empty_res_1 = await client.post(f"/api/applications/{app_id}/notes", json={"content": ""}, headers=headers_a)
    assert empty_res_1.status_code == 400
    assert "empty" in empty_res_1.json()["detail"].lower()

    empty_res_2 = await client.post(f"/api/applications/{app_id}/notes", json={"content": "   "}, headers=headers_a)
    assert empty_res_2.status_code == 400

    # 3. Constraint validation: cannot add note to non-existent application (404 Not Found)
    # 404 rather than 400: every other application endpoint already answers 404
    # for a missing application, so the same condition gets one status code.
    non_existent_res = await client.post("/api/applications/non_existent_app_id_999/notes", json={
        "content": "R2Test note on ghost application"
    }, headers=headers_a)
    assert non_existent_res.status_code == 404
    assert "not found" in non_existent_res.json()["detail"].lower()

    # 4. Successfully add first note (Recruiter info)
    note_1_res = await client.post(f"/api/applications/{app_id}/notes", json={
        "content": "R2Test: Spoke with recruiter Sarah - initial call scheduled."
    }, headers=headers_a)
    assert note_1_res.status_code == 201
    note_1 = note_1_res.json()
    assert note_1["applicationId"] == app_id
    assert "Sarah" in note_1["content"]
    assert "id" in note_1
    assert "createdAt" in note_1

    # 5. Successfully add second note (Interview feedback) - proving one Application -> many Notes
    note_2_res = await client.post(f"/api/applications/{app_id}/notes", json={
        "content": "R2Test: Technical round completed, asked about binary trees and graphs."
    }, headers=headers_a)
    assert note_2_res.status_code == 201
    note_2 = note_2_res.json()
    assert note_2["id"] != note_1["id"]

    # 6. Retrieve notes for the application
    get_notes_res = await client.get(f"/api/applications/{app_id}/notes", headers=headers_a)
    assert get_notes_res.status_code == 200
    notes_list = get_notes_res.json()
    assert len(notes_list) >= 2
    contents = [n["content"] for n in notes_list]
    assert any("Sarah" in c for c in contents)
    assert any("binary trees" in c for c in contents)

    # 7. Check that single application detail also includes the notesList
    get_app_res = await client.get(f"/api/applications/{app_id}", headers=headers_a)
    assert get_app_res.status_code == 200
    app_data = get_app_res.json()
    assert "notesList" in app_data
    assert len(app_data["notesList"]) >= 2


@pytest.mark.asyncio
async def test_privacy_and_ownership_constraints(client):
    """
    Constraint 1: Only the logged-in owner can see, edit, add notes, or filter their own applications.
    Other users must get 403 Forbidden or empty results.
    """
    token_owner = await create_user_and_token(client, "owner.user@r2test.io", "Owner User")
    token_intruder = await create_user_and_token(client, "intruder.user@r2test.io", "Intruder User")

    headers_owner = {"Authorization": f"Bearer {token_owner}"}
    headers_intruder = {"Authorization": f"Bearer {token_intruder}"}

    # Owner creates an application
    create_res = await client.post("/api/applications", json={
        "company": "R2TestStripe",
        "role": "Distributed Systems Engineer",
        "status": "Interview",
        "priority": "High",
    }, headers=headers_owner)
    assert create_res.status_code == 201
    app_id = create_res.json()["id"]

    # 1. Intruder CANNOT read Owner's application -> 404 (IDOR-safe isolation) or 403
    get_res = await client.get(f"/api/applications/{app_id}", headers=headers_intruder)
    assert get_res.status_code in (403, 404)

    # 2. Intruder CANNOT add note to Owner's application -> 403 Forbidden
    add_note_res = await client.post(f"/api/applications/{app_id}/notes", json={
        "content": "R2Test malicious note attempt"
    }, headers=headers_intruder)
    assert add_note_res.status_code == 403

    # 3. Intruder CANNOT view notes of Owner's application -> 403 Forbidden
    get_notes_res = await client.get(f"/api/applications/{app_id}/notes", headers=headers_intruder)
    assert get_notes_res.status_code == 403

    # 4. Intruder CANNOT update Owner's application -> 404 (IDOR-safe isolation) or 403
    patch_res = await client.patch(f"/api/applications/{app_id}", json={
        "status": "Rejected"
    }, headers=headers_intruder)
    assert patch_res.status_code in (403, 404)

    # 5. Intruder CANNOT delete Owner's application -> 404 (IDOR-safe isolation) or 403
    del_res = await client.delete(f"/api/applications/{app_id}", headers=headers_intruder)
    assert del_res.status_code in (403, 404)

    # 6. Intruder querying applications list gets empty results
    list_res = await client.get("/api/applications", headers=headers_intruder)
    assert list_res.status_code == 200
    assert list_res.json() == []

    # 7. Intruder filtering by status gets empty results
    filter_res = await client.get("/api/applications?status=Interview", headers=headers_intruder)
    assert filter_res.status_code == 200
    assert filter_res.json() == []


@pytest.mark.asyncio
async def test_ja06_status_filtering(client):
    """
    JA-06: Filter the application list by status (Applied / Interview / Offer / Rejected).
    Only matching applications shown.
    """
    token = await create_user_and_token(client, "filter.user@r2test.io", "Filter User")
    headers = {"Authorization": f"Bearer {token}"}

    # Create 4 applications with different statuses
    apps_to_create = [
        {"company": "R2TestApple", "role": "iOS Engineer", "status": "Applied"},
        {"company": "R2TestNetflix", "role": "Streaming Backend Engineer", "status": "Interview"},
        {"company": "R2TestMeta", "role": "Frontend Architect", "status": "Offer"},
        {"company": "R2TestAmazon", "role": "Cloud Support Associate", "status": "Rejected"},
    ]

    for item in apps_to_create:
        res = await client.post("/api/applications", json=item, headers=headers)
        assert res.status_code == 201

    # 1. Filter by Applied
    res_applied = await client.get("/api/applications?status=Applied", headers=headers)
    assert res_applied.status_code == 200
    applied_list = res_applied.json()
    assert len(applied_list) == 1
    assert applied_list[0]["company"] == "R2TestApple"
    assert applied_list[0]["status"] == "Applied"

    # 2. Filter by Interview
    res_interview = await client.get("/api/applications?status=Interview", headers=headers)
    assert res_interview.status_code == 200
    interview_list = res_interview.json()
    assert len(interview_list) == 1
    assert interview_list[0]["company"] == "R2TestNetflix"
    assert interview_list[0]["status"] == "Interview"

    # 3. Filter by Offer
    res_offer = await client.get("/api/applications?status=Offer", headers=headers)
    assert res_offer.status_code == 200
    offer_list = res_offer.json()
    assert len(offer_list) == 1
    assert offer_list[0]["company"] == "R2TestMeta"
    assert offer_list[0]["status"] == "Offer"

    # 4. Filter by Rejected
    res_rejected = await client.get("/api/applications?status=Rejected", headers=headers)
    assert res_rejected.status_code == 200
    rejected_list = res_rejected.json()
    assert len(rejected_list) == 1
    assert rejected_list[0]["company"] == "R2TestAmazon"
    assert rejected_list[0]["status"] == "Rejected"

    # 5. Fetch all applications
    res_all = await client.get("/api/applications", headers=headers)
    assert res_all.status_code == 200
    assert len(res_all.json()) == 4


@pytest.mark.asyncio
async def test_ja08_dashboard_aggregation(client):
    """
    JA-08: See a simple Dashboard with total applications + count per status.
    Endpoints: GET /applications/stats and GET /dashboard (total + counts per status)
    """
    token = await create_user_and_token(client, "dashboard.user@r2test.io", "Dashboard User")
    headers = {"Authorization": f"Bearer {token}"}

    # Initially 0 applications
    initial_stats = await client.get("/api/applications/stats", headers=headers)
    assert initial_stats.status_code == 200
    data = initial_stats.json()
    assert data["totalApplications"] == 0
    assert data["applied"] == 0
    assert data["interviews"] == 0
    assert data["offers"] == 0
    assert data["rejected"] == 0

    # Add 1 Applied, 2 Interview, 1 Offer
    await client.post("/api/applications", json={"company": "R2TestA", "role": "Dev", "status": "Applied"}, headers=headers)
    await client.post("/api/applications", json={"company": "R2TestB", "role": "Dev", "status": "Interview"}, headers=headers)
    await client.post("/api/applications", json={"company": "R2TestC", "role": "Dev", "status": "Interview"}, headers=headers)
    await client.post("/api/applications", json={"company": "R2TestD", "role": "Dev", "status": "Offer"}, headers=headers)

    # 1. Test GET /api/applications/stats
    stats_res = await client.get("/api/applications/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["totalApplications"] == 4
    assert stats["applied"] == 1
    assert stats["interviews"] == 2
    assert stats["offers"] == 1
    assert stats["rejected"] == 0

    # 2. Test GET /api/dashboard endpoint directly
    dash_res = await client.get("/api/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_stats = dash_res.json()
    assert dash_stats["totalApplications"] == 4
    assert dash_stats["applied"] == 1
    assert dash_stats["interviews"] == 2
    assert dash_stats["offers"] == 1
    assert dash_stats["rejected"] == 0

    # 3. Test GET /api/dashboard/stats
    dash_stats_res = await client.get("/api/dashboard/stats", headers=headers)
    assert dash_stats_res.status_code == 200
    assert dash_stats_res.json()["totalApplications"] == 4
