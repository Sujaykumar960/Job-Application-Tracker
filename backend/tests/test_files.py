import io
import pytest
import pytest_asyncio
import httpx

from app.database import DatabaseManager
from app.main import app
from app.storage import get_storage_backend


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.files.delete_many({})
        await db.resumes.delete_many({})
        await db.users.delete_many({"email": {"$regex": ".*@filetest\\.io$"}})
        await db.profiles.delete_many({"userId": {"$regex": ".*"}})


async def register_user(client, email: str, name: str, role: str = "seeker") -> tuple:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    return user_id, token


# Valid binary fixtures
VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
VALID_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
FAKE_PDF_BYTES = b"This is plain text pretending to be a PDF file."


@pytest.mark.asyncio
async def test_valid_file_upload(client):
    uid, token = await register_user(client, "alice.upload@filetest.io", "Alice Upload")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload valid PDF
    files = {"file": ("my_resume.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    data = {"purpose": "resume"}
    res = await client.post("/api/files/upload", files=files, data=data, headers=headers)

    assert res.status_code == 201
    meta = res.json()
    assert meta["ownerId"] == uid
    assert meta["originalFilename"] == "my_resume.pdf"
    assert meta["contentType"] == "application/pdf"
    assert meta["size"] == len(VALID_PDF_BYTES)
    assert meta["purpose"] == "resume"
    assert "downloadUrl" in meta
    assert meta["downloadUrl"].startswith("/api/files/")


@pytest.mark.asyncio
async def test_resume_upload_validates_and_persists_bytes(client):
    _, token = await register_user(client, "resume.upload@filetest.io", "Resume Upload")
    headers = {"Authorization": f"Bearer {token}"}
    pdf_bytes = b"%PDF-1.4\nReal resume content"

    upload_res = await client.post(
        "/api/resume/upload",
        files={"file": ("candidate_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 201
    uploaded = upload_res.json()
    assert uploaded["filename"] == "candidate_resume.pdf"
    assert uploaded["size"] == f"{len(pdf_bytes) / (1024 * 1024):.2f} MB"

    resume = await DatabaseManager.db.resumes.find_one({"id": uploaded["id"]})
    assert resume["fileId"]
    assert resume["fileSizeBytes"] == len(pdf_bytes)
    assert resume["contentType"] == "application/pdf"

    file_res = await client.get(resume["fileUrl"], headers=headers)
    assert file_res.status_code == 200
    assert file_res.content == pdf_bytes

    invalid_res = await client.post(
        "/api/resume/upload",
        files={"file": ("fake.pdf", io.BytesIO(b"not a pdf"), "application/pdf")},
        headers=headers,
    )
    assert invalid_res.status_code == 400


@pytest.mark.asyncio
async def test_unsupported_file_type(client):
    _, token = await register_user(client, "bob.type@filetest.io", "Bob Type")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Unsupported extension (.exe)
    files = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00"), "application/octet-stream")}
    res = await client.post("/api/files/upload", files=files, headers=headers)
    assert res.status_code == 400
    assert "unsupported" in res.json()["message"].lower()

    # 2. Magic byte spoofing: .pdf extension with plain text content
    files_fake = {"file": ("spoofed.pdf", io.BytesIO(FAKE_PDF_BYTES), "application/pdf")}
    res_fake = await client.post("/api/files/upload", files=files_fake, headers=headers)
    assert res_fake.status_code == 400
    assert "signature mismatch" in res_fake.json()["message"].lower()


@pytest.mark.asyncio
async def test_oversized_file_rejected(client):
    _, token = await register_user(client, "charlie.size@filetest.io", "Charlie Size")
    headers = {"Authorization": f"Bearer {token}"}

    # Create oversized fake PDF (> 10MB)
    # Magic bytes at start, followed by 10.5 MB of dummy data
    huge_pdf = io.BytesIO(b"%PDF-1.4" + b"A" * (10 * 1024 * 1024 + 500))
    files = {"file": ("huge_resume.pdf", huge_pdf, "application/pdf")}
    res = await client.post("/api/files/upload", files=files, headers=headers)
    assert res.status_code == 413
    assert "exceeds" in res.json()["message"].lower()


@pytest.mark.asyncio
async def test_owner_download_and_content_integrity(client):
    uid, token = await register_user(client, "diana.down@filetest.io", "Diana Download")
    headers = {"Authorization": f"Bearer {token}"}

    # Upload valid PNG
    files = {"file": ("avatar.png", io.BytesIO(VALID_PNG_BYTES), "image/png")}
    data = {"purpose": "profile_avatar"}
    upload_res = await client.post("/api/files/upload", files=files, data=data, headers=headers)
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # Download file as owner
    down_res = await client.get(f"/api/files/{file_id}", headers=headers)
    assert down_res.status_code == 200
    assert down_res.content == VALID_PNG_BYTES
    assert down_res.headers["content-type"] == "image/png"


@pytest.mark.asyncio
async def test_unauthorized_download_prevention(client):
    # User A (owner) uploads private resume
    _, token_a = await register_user(client, "alice.priv@filetest.io", "Alice Private")
    # User B (stranger seeker)
    _, token_b = await register_user(client, "bob.priv@filetest.io", "Bob Stranger")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    files = {"file": ("confidential_resume.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/files/upload", files=files, data={"purpose": "resume"}, headers=headers_a)
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # User B attempts to download User A's private resume -> 403 Forbidden!
    down_res = await client.get(f"/api/files/{file_id}", headers=headers_b)
    assert down_res.status_code == 403
    assert "access denied" in down_res.json()["message"].lower()


@pytest.mark.asyncio
async def test_avatar_and_resume_download_authorization(client):
    owner_id, owner_token = await register_user(client, "owner.visibility@filetest.io", "Owner Visibility")
    _, stranger_token = await register_user(client, "stranger.visibility@filetest.io", "Stranger Visibility")
    _, recruiter_token = await register_user(client, "recruiter.visibility@filetest.io", "Recruiter Visibility", "recruiter")

    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    stranger_headers = {"Authorization": f"Bearer {stranger_token}"}
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    avatar_res = await client.post(
        "/api/files/upload",
        files={"file": ("avatar.png", io.BytesIO(VALID_PNG_BYTES), "image/png")},
        data={"purpose": "profile_avatar"},
        headers=owner_headers,
    )
    assert avatar_res.status_code == 201
    avatar_download = await client.get(f"/api/files/{avatar_res.json()['id']}", headers=stranger_headers)
    assert avatar_download.status_code == 403

    resume_res = await client.post(
        "/api/files/upload",
        files={"file": ("private.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")},
        data={"purpose": "resume"},
        headers=owner_headers,
    )
    assert resume_res.status_code == 201
    resume_download = await client.get(f"/api/files/{resume_res.json()['id']}", headers=recruiter_headers)
    assert resume_download.status_code == 403


@pytest.mark.asyncio
async def test_file_deletion_flow(client):
    _, token_a = await register_user(client, "owner.del@filetest.io", "Owner Del")
    _, token_b = await register_user(client, "other.del@filetest.io", "Other Del")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Upload file
    files = {"file": ("to_delete.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")}
    upload_res = await client.post("/api/files/upload", files=files, headers=headers_a)
    file_id = upload_res.json()["id"]

    # 1. Non-owner attempts delete -> 403 Forbidden
    del_forbidden = await client.delete(f"/api/files/{file_id}", headers=headers_b)
    assert del_forbidden.status_code == 403

    # 2. Owner deletes file -> 200 OK
    del_ok = await client.delete(f"/api/files/{file_id}", headers=headers_a)
    assert del_ok.status_code == 200
    assert del_ok.json()["success"] is True

    # 3. Subsequent download returns 404 Not Found
    down_after = await client.get(f"/api/files/{file_id}", headers=headers_a)
    assert down_after.status_code == 404

    # 4. Subsequent delete returns 404 Not Found
    del_again = await client.delete(f"/api/files/{file_id}", headers=headers_a)
    assert del_again.status_code == 404
