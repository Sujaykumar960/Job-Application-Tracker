import io
import pytest
import pytest_asyncio
import httpx

from bson import ObjectId
from app.database import DatabaseManager
from app.main import app


VALID_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj\n<< /Title (Resume) >>\nendobj\n"
    b"2 0 obj\n<< /Length 120 >>\nstream\n"
    b"Senior Software Engineer with 8 years of experience in Go, Python, React, MongoDB, Distributed Systems and Kubernetes.\n"
    b"endstream\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n240\n%%EOF"
)

VALID_PDF_BYTES_B = (
    b"%PDF-1.4\n1 0 obj\n<< /Title (Bob Resume) >>\nendobj\n"
    b"2 0 obj\n<< /Length 110 >>\nstream\n"
    b"Lead Cloud Architect with 10 years of experience in AWS, Terraform, Docker, Microservices and Kafka.\n"
    b"endstream\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n230\n%%EOF"
)

VALID_DOCX_BYTES = b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + b"\x00" * 200


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Cleanup test data
    db = DatabaseManager.db
    if db is not None:
        await db.files.delete_many({})
        await db.resumes.delete_many({})
        await db.resume_analyses.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@secisolation\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker") -> tuple:
    res = await client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": role,
        },
    )
    assert res.status_code == 201, f"Registration failed: {res.text}"
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    return user_id, token


@pytest.mark.asyncio
async def test_resume_upload_and_auth_binding(client):
    """Verify resume is strictly bound to the authenticated user ID and not frontend-controlled."""
    alice_id, alice_token = await register_user(client, "alice.upload@secisolation.io", "Alice Owner")
    headers = {"Authorization": f"Bearer {alice_token}"}

    files = {"file": ("alice_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    res = await client.post("/api/resumes/upload", files=files, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["userId"] == alice_id
    assert data["filename"] == "alice_cv.pdf"
    assert data["id"].startswith("res_")

    # Verify MongoDB record
    db = DatabaseManager.db
    resume_in_db = await db.resumes.find_one({"id": data["id"]})
    assert resume_in_db is not None
    assert resume_in_db["userId"] == alice_id
    assert resume_in_db["storageKey"] == f"resumes/{alice_id}/{data['id']}/alice_cv.pdf"

    # Verify analysis record
    analysis_in_db = await db.resume_analyses.find_one({"resumeId": data["id"]})
    assert analysis_in_db is not None
    assert analysis_in_db["userId"] == alice_id


@pytest.mark.asyncio
async def test_identical_filenames_two_users_do_not_overwrite(client):
    """Ensure two distinct users can upload files with identical filenames without overwriting each other."""
    alice_id, alice_token = await register_user(client, "alice.same@secisolation.io", "Alice Same")
    bob_id, bob_token = await register_user(client, "bob.same@secisolation.io", "Bob Same")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Both users upload with identical filename "Resume_2026.pdf" but different contents
    upload_alice = await client.post(
        "/api/resumes/upload",
        files={"file": ("Resume_2026.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")},
        headers=alice_headers,
    )
    assert upload_alice.status_code == 201
    alice_res_id = upload_alice.json()["id"]

    upload_bob = await client.post(
        "/api/resumes/upload",
        files={"file": ("Resume_2026.pdf", io.BytesIO(VALID_PDF_BYTES_B), "application/pdf")},
        headers=bob_headers,
    )
    assert upload_bob.status_code == 201
    bob_res_id = upload_bob.json()["id"]

    # Verify storage isolation
    db = DatabaseManager.db
    alice_doc = await db.resumes.find_one({"id": alice_res_id})
    bob_doc = await db.resumes.find_one({"id": bob_res_id})

    assert alice_doc["storageKey"] == f"resumes/{alice_id}/{alice_res_id}/Resume_2026.pdf"
    assert bob_doc["storageKey"] == f"resumes/{bob_id}/{bob_res_id}/Resume_2026.pdf"
    assert alice_doc["storageKey"] != bob_doc["storageKey"]

    # Alice downloads her resume -> gets Alice's content
    down_alice = await client.get(f"/api/resumes/{alice_res_id}/file", headers=alice_headers)
    assert down_alice.status_code == 200
    assert down_alice.content == VALID_PDF_BYTES

    # Bob downloads his resume -> gets Bob's content
    down_bob = await client.get(f"/api/resumes/{bob_res_id}/file", headers=bob_headers)
    assert down_bob.status_code == 200
    assert down_bob.content == VALID_PDF_BYTES_B


@pytest.mark.asyncio
async def test_resume_oversized_file_rejected(client):
    """Ensure resume files larger than 5MB are rejected with 413."""
    _, token = await register_user(client, "alice.size@secisolation.io", "Alice Size")
    headers = {"Authorization": f"Bearer {token}"}

    # 5.5MB file
    huge_data = b"%PDF-1.4\n" + b"X" * (5 * 1024 * 1024 + 500)
    files = {"file": ("huge_resume.pdf", io.BytesIO(huge_data), "application/pdf")}
    res = await client.post("/api/resumes/upload", files=files, headers=headers)
    assert res.status_code == 413
    assert "5 MB" in res.json().get("detail", res.json().get("message", ""))


@pytest.mark.asyncio
async def test_resume_unsupported_file_type_rejected(client):
    """Ensure non-PDF/DOCX files (e.g. PNG, TXT, EXE) are rejected with 400 Bad Request."""
    _, token = await register_user(client, "alice.type@secisolation.io", "Alice Type")
    headers = {"Authorization": f"Bearer {token}"}

    # PNG file
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("photo.png", io.BytesIO(png_bytes), "image/png")}
    res = await client.post("/api/resumes/upload", files=files, headers=headers)
    assert res.status_code == 400
    assert "Unsupported file type" in res.json().get("detail", res.json().get("message", ""))


@pytest.mark.asyncio
async def test_user_cannot_list_another_user_resumes(client):
    """
    Ensure GET /api/resumes?userId=someone_else NEVER returns another user's resumes.
    Only returns resumes where userId == current_user.id.
    """
    alice_id, alice_token = await register_user(client, "alice.list@secisolation.io", "Alice List")
    bob_id, bob_token = await register_user(client, "bob.list@secisolation.io", "Bob List")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Alice uploads a resume
    files = {"file": ("alice_secret_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    assert upload_res.status_code == 201

    # Bob attempts to list resumes with ?userId=alice_id
    bob_list_res = await client.get(f"/api/resumes?userId={alice_id}", headers=bob_headers)
    assert bob_list_res.status_code == 200
    bob_resumes = bob_list_res.json()
    assert len(bob_resumes) == 0, "Bob must receive 0 resumes, never Alice's resumes!"

    # Alice lists her resumes
    alice_list_res = await client.get("/api/resumes", headers=alice_headers)
    assert alice_list_res.status_code == 200
    alice_resumes = alice_list_res.json()
    assert len(alice_resumes) == 1
    assert alice_resumes[0]["userId"] == alice_id
    assert alice_resumes[0]["filename"] == "alice_secret_cv.pdf"


@pytest.mark.asyncio
async def test_user_cannot_get_single_resume_of_another_user(client):
    """Ensure GET /api/resumes/{resume_id} returns 404 for a resume belonging to someone else."""
    _, alice_token = await register_user(client, "alice.single@secisolation.io", "Alice Single")
    _, bob_token = await register_user(client, "bob.single@secisolation.io", "Bob Single")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Alice uploads resume
    files = {"file": ("alice_doc.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob tries to access Alice's resume by ID -> 404 Not Found
    bob_get_res = await client.get(f"/api/resumes/{alice_resume_id}", headers=bob_headers)
    assert bob_get_res.status_code == 404, "Foreign resume must return 404 to avoid enumeration"

    # Alice gets her resume -> 200 OK
    alice_get_res = await client.get(f"/api/resumes/{alice_resume_id}", headers=alice_headers)
    assert alice_get_res.status_code == 200
    assert alice_get_res.json()["id"] == alice_resume_id


@pytest.mark.asyncio
async def test_user_cannot_download_foreign_resume_file(client):
    """Ensure GET /api/resumes/{resume_id}/file returns 404 for foreign resumes."""
    _, alice_token = await register_user(client, "alice.dl@secisolation.io", "Alice DL")
    _, bob_token = await register_user(client, "bob.dl@secisolation.io", "Bob DL")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    files = {"file": ("alice_confidential.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob tries to download Alice's resume file -> 404 Not Found
    bob_dl_res = await client.get(f"/api/resumes/{alice_resume_id}/file", headers=bob_headers)
    assert bob_dl_res.status_code == 404

    # Alice downloads her resume file -> 200 OK
    alice_dl_res = await client.get(f"/api/resumes/{alice_resume_id}/file", headers=alice_headers)
    assert alice_dl_res.status_code == 200
    assert alice_dl_res.content == VALID_PDF_BYTES


@pytest.mark.asyncio
async def test_user_cannot_read_another_user_resume_analysis(client):
    """Ensure GET /api/resumes/{resume_id}/analysis and /analyses return 404 for foreign resumes."""
    _, alice_token = await register_user(client, "alice.ana@secisolation.io", "Alice Analysis")
    _, bob_token = await register_user(client, "bob.ana@secisolation.io", "Bob Analysis")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    files = {"file": ("alice_metrics.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob tries to read Alice's analysis -> 404 Not Found
    bob_ana_res = await client.get(f"/api/resumes/{alice_resume_id}/analysis", headers=bob_headers)
    assert bob_ana_res.status_code == 404

    # Bob tries to read Alice's analyses list -> 404 Not Found
    bob_analyses_res = await client.get(f"/api/resumes/{alice_resume_id}/analyses", headers=bob_headers)
    assert bob_analyses_res.status_code == 404

    # Bob queries /api/resumes/analysis (user-scoped) -> None/Empty (Bob has no analysis)
    bob_my_ana = await client.get("/api/resumes/analysis", headers=bob_headers)
    assert bob_my_ana.status_code == 200
    assert bob_my_ana.json() is None

    # Alice reads her analysis -> 200 OK
    alice_ana_res = await client.get(f"/api/resumes/{alice_resume_id}/analysis", headers=alice_headers)
    assert alice_ana_res.status_code == 200
    assert alice_ana_res.json() is not None
    assert alice_ana_res.json()["resumeId"] == alice_resume_id


@pytest.mark.asyncio
async def test_user_cannot_trigger_analysis_on_foreign_resume(client):
    """Ensure POST /api/resumes/{resume_id}/analyze returns 404 when targeting another user's resume."""
    _, alice_token = await register_user(client, "alice.trigger@secisolation.io", "Alice Trigger")
    _, bob_token = await register_user(client, "bob.trigger@secisolation.io", "Bob Trigger")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    files = {"file": ("alice_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob attempts to analyze Alice's resume -> 404 Not Found
    bob_trigger = await client.post(
        f"/api/resumes/{alice_resume_id}/analyze",
        json={"jobDescription": "Staff Engineer"},
        headers=bob_headers,
    )
    assert bob_trigger.status_code == 404

    # Alice analyzes her resume -> 200 OK
    alice_trigger = await client.post(
        f"/api/resumes/{alice_resume_id}/analyze",
        json={"jobDescription": "Staff Engineer"},
        headers=alice_headers,
    )
    assert alice_trigger.status_code == 200
    assert alice_trigger.json()["resumeId"] == alice_resume_id


@pytest.mark.asyncio
async def test_user_cannot_activate_foreign_resume(client):
    """Ensure PATCH /api/resumes/{resume_id}/active returns 404 for foreign resumes."""
    alice_id, alice_token = await register_user(client, "alice.act@secisolation.io", "Alice Act")
    bob_id, bob_token = await register_user(client, "bob.act@secisolation.io", "Bob Act")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    files = {"file": ("alice_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob attempts to activate Alice's resume -> 404 Not Found
    bob_act = await client.patch(f"/api/resumes/{alice_resume_id}/active", headers=bob_headers)
    assert bob_act.status_code == 404

    # Verify Bob's activeResumeId in DB was not set to Alice's resume
    db = DatabaseManager.db
    bob_user = await db.users.find_one({"$or": [{"id": bob_id}, {"_id": ObjectId(bob_id)}]}) if ObjectId.is_valid(bob_id) else await db.users.find_one({"id": bob_id})
    assert (bob_user or {}).get("activeResumeId") != alice_resume_id
    bob_profile = await db.profiles.find_one({"userId": bob_id})
    assert (bob_profile or {}).get("activeResumeId") != alice_resume_id


@pytest.mark.asyncio
async def test_user_cannot_delete_foreign_resume(client):
    """Ensure DELETE /api/resumes/{resume_id} returns 404 and does not delete foreign resumes."""
    alice_id, alice_token = await register_user(client, "alice.del@secisolation.io", "Alice Del")
    _, bob_token = await register_user(client, "bob.del@secisolation.io", "Bob Del")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    files = {"file": ("alice_precious.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/resumes/upload", files=files, headers=alice_headers)
    alice_resume_id = upload_res.json()["id"]

    # Bob attempts to delete Alice's resume -> 404 Not Found
    bob_del = await client.delete(f"/api/resumes/{alice_resume_id}", headers=bob_headers)
    assert bob_del.status_code == 404

    # Verify Alice's resume still exists in DB
    db = DatabaseManager.db
    resume = await db.resumes.find_one({"id": alice_resume_id, "userId": alice_id})
    assert resume is not None, "Alice's resume must not have been deleted!"


@pytest.mark.asyncio
async def test_active_resume_and_current_endpoints(client):
    """Test GET /api/resumes/active and GET /api/resumes/current route isolation and user scoping."""
    alice_id, alice_token = await register_user(client, "alice.cur@secisolation.io", "Alice Current")
    bob_id, bob_token = await register_user(client, "bob.cur@secisolation.io", "Bob Current")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Alice uploads resume A
    files_a = {"file": ("alice_cv1.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    res_a = await client.post("/api/resumes/upload", files=files_a, headers=alice_headers)
    res_a_id = res_a.json()["id"]

    # Bob uploads resume B
    files_b = {"file": ("bob_cv1.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    res_b = await client.post("/api/resumes/upload", files=files_b, headers=bob_headers)
    res_b_id = res_b.json()["id"]

    # Alice checks active resume
    alice_active = await client.get("/api/resumes/active", headers=alice_headers)
    assert alice_active.status_code == 200
    assert alice_active.json()["id"] == res_a_id
    assert alice_active.json()["userId"] == alice_id

    # Bob checks active resume
    bob_active = await client.get("/api/resumes/active", headers=bob_headers)
    assert bob_active.status_code == 200
    assert bob_active.json()["id"] == res_b_id
    assert bob_active.json()["userId"] == bob_id

    # Test /current alias
    alice_current = await client.get("/api/resumes/current", headers=alice_headers)
    assert alice_current.status_code == 200
    assert alice_current.json()["id"] == res_a_id


@pytest.mark.asyncio
async def test_resume_deletion_cascade_isolation(client):
    """
    Test that deleting Alice's resume deletes only Alice's analyses and file metadata,
    leaving Bob's resume and analyses untouched.
    """
    alice_id, alice_token = await register_user(client, "alice.casc@secisolation.io", "Alice Casc")
    bob_id, bob_token = await register_user(client, "bob.casc@secisolation.io", "Bob Casc")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Alice uploads resume A
    files_a = {"file": ("alice_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    res_a = await client.post("/api/resumes/upload", files=files_a, headers=alice_headers)
    res_a_id = res_a.json()["id"]

    # Bob uploads resume B
    files_b = {"file": ("bob_cv.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    res_b = await client.post("/api/resumes/upload", files=files_b, headers=bob_headers)
    res_b_id = res_b.json()["id"]

    # Alice deletes her resume
    del_res = await client.delete(f"/api/resumes/{res_a_id}", headers=alice_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    db = DatabaseManager.db
    # Alice's resume & analyses are gone
    assert await db.resumes.find_one({"id": res_a_id}) is None
    assert await db.resume_analyses.find_one({"resumeId": res_a_id}) is None

    # Bob's resume & analyses are completely intact
    bob_resume = await db.resumes.find_one({"id": res_b_id})
    assert bob_resume is not None
    assert bob_resume["userId"] == bob_id
    bob_analysis = await db.resume_analyses.find_one({"resumeId": res_b_id})
    assert bob_analysis is not None
    assert bob_analysis["userId"] == bob_id


@pytest.mark.asyncio
async def test_groq_analysis_isolation_and_all_fields_populated(client):
    """
    Verify complete AI ATS analysis field population and strict multi-tenant isolation.
    Tests:
      - Authenticated User -> User's Resume -> Resume Text -> AI Analysis -> DB Storage (userId + resumeId)
      - Both users upload 'resume-A.pdf' with identical text
      - Produces separate MongoDB records with isolated userId & resumeId
      - All granular attributes populated: atsScore, percentile, targetProfile, keywords,
        hardSkills, pillars, strengths, optimizationAreas, extractedSkills, experienceRewrites,
        projects, education, formattingRecommendations.
    """
    alice_id, alice_token = await register_user(client, "alice.ai@secisolation.io", "Alice AI")
    bob_id, bob_token = await register_user(client, "bob.ai@secisolation.io", "Bob AI")

    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Both users upload identical filename and text
    res_a = await client.post(
        "/api/resumes/upload",
        files={"file": ("resume-A.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")},
        headers=alice_headers,
    )
    assert res_a.status_code == 201
    alice_res_id = res_a.json()["id"]

    res_b = await client.post(
        "/api/resumes/upload",
        files={"file": ("resume-A.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")},
        headers=bob_headers,
    )
    assert res_b.status_code == 201
    bob_res_id = res_b.json()["id"]

    assert alice_res_id != bob_res_id

    # Trigger fresh analysis for Alice
    ana_a_res = await client.post(
        f"/api/resumes/{alice_res_id}/analyze",
        json={"jobDescription": "Staff Backend Engineer"},
        headers=alice_headers,
    )
    assert ana_a_res.status_code == 200
    ana_a = ana_a_res.json()

    # Validate all requested fields
    assert "atsScore" in ana_a and isinstance(ana_a["atsScore"], int)
    assert "percentile" in ana_a and isinstance(ana_a["percentile"], int)
    assert "targetProfile" in ana_a and ana_a["targetProfile"] is not None
    assert "targetRole" in ana_a and ana_a["targetRole"] is not None
    assert "keywords" in ana_a and isinstance(ana_a["keywords"], list)
    assert "hardSkills" in ana_a and isinstance(ana_a["hardSkills"], list)
    assert "pillars" in ana_a and len(ana_a["pillars"]) >= 4
    assert "strengths" in ana_a and len(ana_a["strengths"]) > 0
    assert "weaknesses" in ana_a
    assert "optimizationAreas" in ana_a and isinstance(ana_a["optimizationAreas"], list)
    assert "extractedSkills" in ana_a and isinstance(ana_a["extractedSkills"], dict)
    assert "bulletImprovements" in ana_a and isinstance(ana_a["bulletImprovements"], list)
    assert "experienceRewrites" in ana_a and isinstance(ana_a["experienceRewrites"], list)
    assert "projects" in ana_a and isinstance(ana_a["projects"], list)
    assert "education" in ana_a and isinstance(ana_a["education"], list)
    assert "formattingRecommendations" in ana_a and isinstance(ana_a["formattingRecommendations"], list)

    assert ana_a["userId"] == alice_id
    assert ana_a["resumeId"] == alice_res_id

    # Trigger fresh analysis for Bob
    ana_b_res = await client.post(
        f"/api/resumes/{bob_res_id}/analyze",
        json={"jobDescription": "Staff Backend Engineer"},
        headers=bob_headers,
    )
    assert ana_b_res.status_code == 200
    ana_b = ana_b_res.json()
    assert ana_b["userId"] == bob_id
    assert ana_b["resumeId"] == bob_res_id

    # Cross-tenant read access prevention
    # Bob reading Alice's analysis -> 404
    bob_reads_alice = await client.get(f"/api/resumes/{alice_res_id}/analysis", headers=bob_headers)
    assert bob_reads_alice.status_code == 404

    # Alice reading Bob's analysis -> 404
    alice_reads_bob = await client.get(f"/api/resumes/{bob_res_id}/analysis", headers=alice_headers)
    assert alice_reads_bob.status_code == 404

    # Direct DB verification: check that both records exist separately with their own userId
    db = DatabaseManager.db
    doc_a = await db.resume_analyses.find_one({"resumeId": alice_res_id, "userId": alice_id})
    doc_b = await db.resume_analyses.find_one({"resumeId": bob_res_id, "userId": bob_id})
    assert doc_a is not None
    assert doc_b is not None
    assert doc_a["_id"] != doc_b["_id"]
    assert doc_a["userId"] == alice_id
    assert doc_b["userId"] == bob_id

