"""
=============================================================================
CareerX - Member 1: Application Integrity & Demo-Data Gating
=============================================================================

Coverage areas:
  A. Note deletion is scoped to the application named in the path
  B. Synthetic application seeding is gated on an explicit demo flag
  C. JA-08 analytics stay truthful for real accounts
"""

import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app

DOMAIN = "appintegrity.io"


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    db = DatabaseManager.db
    if db is not None:
        users = await db.users.find(
            {"email": {"$regex": f".*@{DOMAIN.replace('.', chr(92) + '.')}$"}},
            {"_id": 1, "id": 1},
        ).to_list(200)
        uids = [str(u.get("id") or u["_id"]) for u in users]
        if uids:
            await db.notes.delete_many({"userId": {"$in": uids}})
            await db.applications.delete_many({"userId": {"$in": uids}})
            await db.resumes.delete_many({"userId": {"$in": uids}})
            await db.resume_analyses.delete_many({"userId": {"$in": uids}})
            await db.profiles.delete_many({"userId": {"$in": uids}})
            await db.users.delete_many({"_id": {"$in": [u["_id"] for u in users]}})


async def _register(client, name: str, email: str, role: str = "seeker"):
    res = await client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "Password123!", "role": role},
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return {
        "id": data["user"]["id"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


async def _flag_as_demo(db, user_id: str) -> None:
    """Mark an account as demo the way an operator would.

    Accounts registered through the API are keyed by ObjectId `_id`, so the
    flag has to be set against whichever id shape the document actually uses.
    """
    from bson import ObjectId

    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"id": user_id}
    result = await db.users.update_one(query, {"$set": {"isDemoAccount": True}})
    assert result.matched_count == 1, "could not locate the user document to flag"


async def _make_app(client, headers, company: str, role: str = "SRE") -> dict:
    res = await client.post(
        "/api/applications",
        json={"company": company, "role": role, "status": "Applied"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


# ─────────────────────────────────────────────────────────────────────────────
# A.  NOTE DELETION IS SCOPED TO THE APPLICATION IN THE PATH
# ─────────────────────────────────────────────────────────────────────────────

class TestNoteDeleteApplicationScope:
    """`DELETE /applications/{app_id}/notes/{note_id}` must honour `app_id`.

    A note id is unguessable, but a user holds many of their own, so a delete
    scoped only on `userId` lets a caller route the request through any
    application they own and remove a note attached to a different one.
    """

    @pytest.mark.asyncio
    async def test_legitimate_delete_still_works(self, client):
        user = await _register(client, "Note Owner", f"note.owner@{DOMAIN}")
        app = await _make_app(client, user["headers"], "Acme")
        note = (
            await client.post(
                f"/api/applications/{app['id']}/notes",
                json={"content": "recruiter said 120k base"},
                headers=user["headers"],
            )
        ).json()

        res = await client.delete(
            f"/api/applications/{app['id']}/notes/{note['id']}", headers=user["headers"]
        )
        assert res.status_code == 200

        remaining = (
            await client.get(f"/api/applications/{app['id']}/notes", headers=user["headers"])
        ).json()
        assert all(n["id"] != note["id"] for n in remaining)

    @pytest.mark.asyncio
    async def test_cannot_delete_note_via_a_different_application(self, client):
        user = await _register(client, "Scope Owner", f"scope.owner@{DOMAIN}")
        app_one = await _make_app(client, user["headers"], "Acme")
        app_two = await _make_app(client, user["headers"], "Globex")

        note_one = (
            await client.post(
                f"/api/applications/{app_one['id']}/notes",
                json={"content": "note belonging to application ONE"},
                headers=user["headers"],
            )
        ).json()
        note_two = (
            await client.post(
                f"/api/applications/{app_two['id']}/notes",
                json={"content": "note belonging to application TWO"},
                headers=user["headers"],
            )
        ).json()

        # Route the delete for note_two through application one.
        res = await client.delete(
            f"/api/applications/{app_one['id']}/notes/{note_two['id']}", headers=user["headers"]
        )
        assert res.status_code == 404, (
            "note delete must be scoped to the application in the path; "
            f"got {res.status_code} {res.text}"
        )

        # The note must survive on its real parent.
        still_there = (
            await client.get(f"/api/applications/{app_two['id']}/notes", headers=user["headers"])
        ).json()
        assert any(n["id"] == note_two["id"] for n in still_there), (
            "note was deleted through the wrong application"
        )

    @pytest.mark.asyncio
    async def test_cannot_delete_another_users_note_via_own_application(self, client):
        owner = await _register(client, "Victim", f"victim@{DOMAIN}")
        attacker = await _register(client, "Attacker", f"attacker@{DOMAIN}")

        victim_app = await _make_app(client, owner["headers"], "Victim Corp")
        victim_note = (
            await client.post(
                f"/api/applications/{victim_app['id']}/notes",
                json={"content": "confidential salary feedback"},
                headers=owner["headers"],
            )
        ).json()

        attacker_app = await _make_app(client, attacker["headers"], "Attacker Corp")
        res = await client.delete(
            f"/api/applications/{attacker_app['id']}/notes/{victim_note['id']}",
            headers=attacker["headers"],
        )
        assert res.status_code == 404

        survivor = (
            await client.get(
                f"/api/applications/{victim_app['id']}/notes", headers=owner["headers"]
            )
        ).json()
        assert any(n["id"] == victim_note["id"] for n in survivor)

    @pytest.mark.asyncio
    async def test_note_on_missing_application_returns_404_not_400(self, client):
        """All application endpoints agree that a missing application is a 404."""
        user = await _register(client, "Missing App", f"missing.app@{DOMAIN}")
        res = await client.post(
            "/api/applications/6abc14bf86b4cc653358b955/notes",
            json={"content": "note for an application that does not exist"},
            headers=user["headers"],
        )
        assert res.status_code == 404, (
            f"expected 404 to match every other application endpoint, got {res.status_code}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# B.  SYNTHETIC SEEDING IS GATED ON AN EXPLICIT DEMO FLAG
# ─────────────────────────────────────────────────────────────────────────────

class TestSyntheticSeedingIsDemoGated:
    """The 50-application dataset is demo content and must stay demo-only.

    JA-08's funnel, metric cards and conversion rates aggregate directly off
    the applications collection, so an unseeded real account is what keeps those
    numbers honest.
    """

    @pytest.mark.asyncio
    async def test_real_account_with_resume_gets_no_synthetic_applications(self, client):
        user = await _register(client, "Real Seeker", f"real.seeker@{DOMAIN}")
        db = DatabaseManager.db

        # Give the account a resume: that used to be the trigger for seeding.
        await db.resumes.insert_one(
            {"id": "res-real-1", "userId": user["id"], "name": "real.pdf", "atsScore": 82}
        )

        listed = (await client.get("/api/applications", headers=user["headers"])).json()
        assert listed == [], f"real account was seeded with {len(listed)} synthetic applications"

        overview = (await client.get("/api/dashboard/overview", headers=user["headers"])).json()
        assert overview["applications"]["total"] == 0

    @pytest.mark.asyncio
    async def test_demo_account_is_still_seeded(self, client):
        user = await _register(client, "Demo Seeker", f"demo.seeker@{DOMAIN}")
        db = DatabaseManager.db
        await _flag_as_demo(db, user["id"])

        listed = (await client.get("/api/applications", headers=user["headers"])).json()
        assert len(listed) == 50, f"demo account expected 50 seeded applications, got {len(listed)}"

    @pytest.mark.asyncio
    async def test_seeded_demo_data_is_scoped_to_the_flagged_account(self, client):
        """Seeding one demo account must never touch another account's data."""
        demo = await _register(client, "Flagged Demo", f"flagged.demo@{DOMAIN}")
        bystander = await _register(client, "Bystander", f"bystander@{DOMAIN}")
        db = DatabaseManager.db
        await _flag_as_demo(db, demo["id"])

        await client.get("/api/applications", headers=demo["headers"])

        demo_count = await db.applications.count_documents({"userId": demo["id"]})
        bystander_count = await db.applications.count_documents({"userId": bystander["id"]})
        assert demo_count == 50
        assert bystander_count == 0

    @pytest.mark.asyncio
    async def test_dashboard_funnel_reports_zero_for_a_real_account(self, client):
        user = await _register(client, "Honest Funnel", f"honest.funnel@{DOMAIN}")

        stats = (await client.get("/api/dashboard/stats", headers=user["headers"])).json()
        assert stats.get("total", 0) == 0

        overview = (await client.get("/api/dashboard/overview", headers=user["headers"])).json()
        by_status = overview["applications"].get("byStatus", {})
        assert not any(v for v in by_status.values()), (
            f"funnel reported fabricated status counts: {by_status}"
        )

    @pytest.mark.asyncio
    async def test_client_supplied_flag_cannot_grant_seeding(self, client):
        """The gate reads the users collection, not the request payload."""
        user = await _register(client, "No Injection", f"no.injection@{DOMAIN}")
        db = DatabaseManager.db

        res = await client.patch(
            "/api/users/me",
            json={"isDemoAccount": True, "name": "No Injection"},
            headers=user["headers"],
        )
        assert res.status_code == 200, res.text
        assert "isDemoAccount" not in res.json(), (
            "profile response must not expose or accept isDemoAccount"
        )

        # UserProfileUpdate is an allowlist, so the extra key is dropped rather
        # than written: confirm the flag is absent from the stored document.
        stored = await db.users.find_one({"email": f"no.injection@{DOMAIN}"})
        assert not stored.get("isDemoAccount"), "profile update wrote isDemoAccount"

        listed = (await client.get("/api/applications", headers=user["headers"])).json()
        assert listed == [], "seeding was granted through a request payload"
