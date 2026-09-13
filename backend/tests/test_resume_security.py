import io
import json
from unittest.mock import AsyncMock, patch
import docx
import httpx
import pytest
import pytest_asyncio
from reportlab.pdfgen import canvas

from app.database import DatabaseManager
from app.main import app
from app.schemas.resume import ResumeAnalysisResult
from app.storage import get_storage_backend


def generate_test_pdf_bytes(text: str = "Alex Rivera Senior Backend Engineer. Skills: Go, Kafka, Redis, Docker, Microservices.") -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(72, 750, text)
    c.drawString(72, 730, "Education: BS Computer Science, University of Washington, 2024")
    c.drawString(72, 710, "Experience: Built high throughput distributed rate limiter processing 10k req/sec.")
    c.save()
    return buffer.getvalue()


def generate_test_docx_bytes(text: str = "Elena Rostova Lead Frontend Architect. Skills: React, TypeScript, GraphQL, Next.js, Tailwind.") -> bytes:
    buffer = io.BytesIO()
    doc = docx.Document()
    doc.add_paragraph(text)
    doc.add_paragraph("Education: MS Software Engineering, Stanford University, 2023")
    doc.add_paragraph("Experience: Optimized web vital rendering time by 40% using code splitting and CRDT sync.")
    doc.save(buffer)
    return buffer.getvalue()


MOCK_GROQ_VALID_RESPONSE = {
    "atsScore": 88,
    "atsBreakdown": {
        "overallScore": 88,
        "keywordsScore": 90,
        "impactScore": 85,
        "formattingScore": 92,
        "completenessScore": 86,
    },
    "pillars": [
        {
            "title": "Keywords & Hard Skills",
            "weight": "35% weight",
            "score": 90,
            "status": "optimal",
            "summary": "Strong alignment with distributed systems and backend technologies.",
        },
        {
            "title": "Impact & Metrics",
            "weight": "30% weight",
            "score": 85,
            "status": "good",
            "summary": "Solid quantifiable metrics on throughput and rate limiting.",
        },
        {
            "title": "Formatting & Readability",
            "weight": "20% weight",
            "score": 92,
            "status": "optimal",
            "summary": "Linear parseable layout with standard header hierarchy.",
        },
        {
            "title": "Section Completeness",
            "weight": "15% weight",
            "score": 86,
            "status": "good",
            "summary": "Key technical sections and contact credentials fully present.",
        },
    ],
    "strengths": [
        "Strong action verbs leading technical impact bullets.",
        "Clear demonstration of concurrent languages (Go, Python).",
    ],
    "weaknesses": [
        "Could expand on cloud infrastructure topologies (AWS ECS, Kubernetes).",
    ],
    "missingKeywords": [
        {"name": "Kubernetes", "priority": "High", "category": "DevOps & Cloud"},
        {"name": "OpenTelemetry", "priority": "Medium", "category": "Observability"},
    ],
    "extractedSkills": {
        "Languages": ["Go", "Python"],
        "Databases & Storage": ["Redis", "Kafka"],
        "Architecture": ["Distributed Systems", "Microservices"],
    },
    "bulletImprovements": [
        {
            "id": "b-1",
            "section": "Work Experience",
            "original": "Built high throughput distributed rate limiter processing 10k req/sec.",
            "optimized": "Architected a distributed sliding-window rate limiter in Go, handling 10k req/sec with zero packet loss.",
            "rationale": "Applies STAR framing and clarifies algorithmic mechanism.",
            "scoreImpact": "+4% Impact Score",
        }
    ],
    "recommendations": [
        "Specify latency percentiles (e.g. p99 latency) for the rate limiter service.",
    ],
    "formattingHealth": [
        {"label": "Single-Column Linear Hierarchy", "status": "Passed", "detail": "100% parseable standard headers."},
    ],
}


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test users, resumes, and analyses
    db = DatabaseManager.db
    if db is not None:
        await db.users.delete_many({"email": {"$regex": ".*@resumetest\\.io$"}})
        await db.resumes.delete_many({"userId": {"$regex": "^usr_test_.*"}})
        await db.resume_analyses.delete_many({"userId": {"$regex": "^usr_test_.*"}})


async def register_test_user(client: httpx.AsyncClient, email: str, name: str) -> tuple[str, str]:
    res = await client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "SecurePassword123!", "role": "seeker"},
    )
    assert res.status_code == 201
    data = res.json()
    return data["user"]["id"], data["access_token"]


@pytest.mark.asyncio
async def test_empty_database_resume_list(client):
    """Empty database must return empty list without fabricating fake resumes."""
    uid, token = await register_test_user(client, "empty.user@resumetest.io", "Empty User")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/resumes", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    # Active resume should return 404
    active_res = await client.get("/api/resumes/active", headers=headers)
    assert active_res.status_code == 404

    # Analysis should return 404
    analysis_res = await client.get("/api/resumes/analysis", headers=headers)
    assert analysis_res.status_code == 404


@pytest.mark.asyncio
async def test_file_security_validations(client):
    """Rigorous file security tests: empty, oversized, MIME spoofing, malformed documents, path traversal."""
    uid, token = await register_test_user(client, "security.user@resumetest.io", "Security Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Empty file (0 bytes) -> 400
    res_empty = await client.post(
        "/api/resumes/upload",
        files={"file": ("empty.pdf", b"", "application/pdf")},
        headers=headers,
    )
    assert res_empty.status_code == 400
    assert "empty" in res_empty.json()["detail"].lower()

    # 2. Corrupted / Tiny file (< 4 bytes) -> 400
    res_tiny = await client.post(
        "/api/resumes/upload",
        files={"file": ("tiny.pdf", b"%PD", "application/pdf")},
        headers=headers,
    )
    assert res_tiny.status_code == 400

    # 3. MIME spoofing: Text file renamed to .pdf -> 400 (magic bytes check)
    res_spoof = await client.post(
        "/api/resumes/upload",
        files={"file": ("fake.pdf", b"This is plain text pretending to be a PDF document", "application/pdf")},
        headers=headers,
    )
    assert res_spoof.status_code == 400
    assert "signature mismatch" in res_spoof.json()["detail"].lower()

    # 4. Disallowed file extension (.sh) -> 400
    res_ext = await client.post(
        "/api/resumes/upload",
        files={"file": ("script.sh", b"#!/bin/bash\necho hello", "application/x-sh")},
        headers=headers,
    )
    assert res_ext.status_code == 400
    assert "unsupported" in res_ext.json()["detail"].lower()

    # 5. Oversized file (> 10MB) -> 413
    huge_pdf = b"%PDF-" + b"0" * (10 * 1024 * 1024 + 1024)
    res_huge = await client.post(
        "/api/resumes/upload",
        files={"file": ("huge.pdf", huge_pdf, "application/pdf")},
        headers=headers,
    )
    assert res_huge.status_code == 413

    # 6. Path traversal in filename -> Sanitized safely
    valid_pdf = generate_test_pdf_bytes()
    res_trav = await client.post(
        "/api/resumes/upload",
        files={"file": ("../../../../etc/passwd.pdf", valid_pdf, "application/pdf")},
        headers=headers,
    )
    assert res_trav.status_code == 201
    trav_data = res_trav.json()
    assert ".." not in trav_data["name"]
    assert "/" not in trav_data["name"]
    assert "\\" not in trav_data["name"]


@pytest.mark.asyncio
async def test_multi_user_isolation_and_authorization(client):
    """User A and User B cannot access, activate, delete, or analyze each other's resumes."""
    uid_a, token_a = await register_test_user(client, "alice.resume@resumetest.io", "Alice Seeker")
    uid_b, token_b = await register_test_user(client, "bob.resume@resumetest.io", "Bob Seeker")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice uploads Resume A
    pdf_a = generate_test_pdf_bytes("Alice Software Engineer Go Distributed Systems")
    res_a = await client.post(
        "/api/resumes/upload",
        files={"file": ("Alice_Resume.pdf", pdf_a, "application/pdf")},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    # Bob uploads Resume B
    docx_b = generate_test_docx_bytes("Bob Frontend Architect React TypeScript")
    res_b = await client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Resume.docx", docx_b, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    # 1. Directory isolation: Alice only sees Resume A, Bob only sees Resume B
    list_a = await client.get("/api/resumes", headers=headers_a)
    assert len(list_a.json()) == 1
    assert list_a.json()[0]["id"] == id_a

    list_b = await client.get("/api/resumes", headers=headers_b)
    assert len(list_b.json()) == 1
    assert list_b.json()[0]["id"] == id_b

    # 2. Cross-user activate forbidden (403)
    hack_activate = await client.patch(f"/api/resumes/{id_b}/active", headers=headers_a)
    assert hack_activate.status_code == 403

    # 3. Cross-user delete forbidden (403)
    hack_delete = await client.delete(f"/api/resumes/{id_b}", headers=headers_a)
    assert hack_delete.status_code == 403

    # 4. Cross-user analyze forbidden (403)
    hack_analyze = await client.post(f"/api/resumes/{id_b}/analyze", headers=headers_a)
    assert hack_analyze.status_code == 403

    # 5. Cross-user analysis retrieval forbidden (403)
    hack_get_analysis = await client.get(f"/api/resumes/{id_b}/analysis", headers=headers_a)
    assert hack_get_analysis.status_code == 403


@pytest.mark.asyncio
async def test_security_order_unauthorized_never_sent_to_groq(client):
    """Ownership verification MUST happen before reading file or calling Groq."""
    uid_a, token_a = await register_test_user(client, "alice.order@resumetest.io", "Alice Order")
    uid_b, token_b = await register_test_user(client, "bob.order@resumetest.io", "Bob Order")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    pdf_b = generate_test_pdf_bytes("Bob Secret Candidate Information")
    res_b = await client.post(
        "/api/resumes/upload",
        files={"file": ("Bob_Secret.pdf", pdf_b, "application/pdf")},
        headers=headers_b,
    )
    id_b = res_b.json()["id"]

    # Mock Groq client create method
    mock_create = AsyncMock()
    with patch("groq.resources.chat.completions.AsyncCompletions.create", mock_create):
        # Alice attempts to analyze Bob's resume
        hack_res = await client.post(f"/api/resumes/{id_b}/analyze", headers=headers_a)
        assert hack_res.status_code == 403

        # Verify Groq was NEVER called
        mock_create.assert_not_called()


@pytest.mark.asyncio
async def test_real_end_to_end_resume_lifecycle_and_analysis(client):
    """Full lifecycle: Register -> Upload PDF -> Verify Storage -> Analyze via Groq -> Persist -> Re-analyze with Job Description -> Delete."""
    uid, token = await register_test_user(client, "e2e.user@resumetest.io", "E2E Candidate")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload valid PDF
    pdf_bytes = generate_test_pdf_bytes("Alex Rivera Senior Distributed Systems Engineer. Skills: Go, Kafka, Redis, Docker.")
    upload_res = await client.post(
        "/api/resumes/upload",
        files={"file": ("Alex_Rivera.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload_res.status_code == 201
    resume_data = upload_res.json()
    resume_id = resume_data["id"]
    assert resume_data["format"] == "PDF"
    assert resume_data["isActive"] is True

    # 2. Verify MongoDB record
    db = DatabaseManager.db
    assert db is not None
    resume_doc = await db.resumes.find_one({"id": resume_id})
    assert resume_doc is not None
    assert resume_doc["userId"] == uid
    assert "Alex Rivera" in resume_doc["parsedText"]

    # 3. Verify storage file exists on disk
    storage = get_storage_backend()
    assert await storage.exists(resume_doc["storageKey"]) is True

    # 4. Mock Groq Chat Completions with valid structured response
    class MockMessage:
        def __init__(self, content):
            self.content = content

    class MockChoice:
        def __init__(self, content):
            self.message = MockMessage(content)

    class MockResponse:
        def __init__(self, content_dict):
            self.choices = [MockChoice(json.dumps(content_dict))]

    with patch("app.config.settings.GROQ_API_KEY", "gsk_test_mock_api_key"):
        from app.services.ai_service import ResumeAiService
        test_ai_svc = ResumeAiService(api_key="gsk_test_mock_api_key")
        with patch("app.routers.resumes.get_resume_ai_service", return_value=test_ai_svc):
            with patch.object(
                test_ai_svc,
                "_get_client",
            ) as mock_get_client:
                mock_client = AsyncMock()
                mock_client.chat.completions.create = AsyncMock(return_value=MockResponse(MOCK_GROQ_VALID_RESPONSE))
                mock_get_client.return_value = mock_client

                # 5. Trigger AI Analysis
                analyze_res = await client.post(
                    f"/api/resumes/{resume_id}/analyze",
                    json={"jobDescription": "Looking for Senior Go Developer with Kafka and Kubernetes experience."},
                    headers=headers,
                )
                assert analyze_res.status_code == 200
                analysis_data = analyze_res.json()
                assert analysis_data["atsScore"] == 88
                assert analysis_data["atsBreakdown"]["overallScore"] == 88
                assert len(analysis_data["pillars"]) == 4
                assert len(analysis_data["strengths"]) >= 1
                assert len(analysis_data["missingKeywords"]) >= 1
                assert len(analysis_data["bulletImprovements"]) >= 1

                # Verify Groq was called with actual resume text
                call_args = mock_client.chat.completions.create.call_args[1]
                user_msg = next(m["content"] for m in call_args["messages"] if m["role"] == "user")
                assert "Alex Rivera Senior Distributed Systems Engineer" in user_msg
                assert "Looking for Senior Go Developer" in user_msg

        # 6. Verify MongoDB analysis document
        analysis_doc = await db.resume_analyses.find_one({"resumeId": resume_id})
        assert analysis_doc is not None
        assert analysis_doc["userId"] == uid
        assert analysis_doc["atsScore"] == 88

        # 7. Verify resume document ATS score was updated
        updated_resume = await db.resumes.find_one({"id": resume_id})
        assert updated_resume["atsScore"] == 88

        # 8. Retrieve latest analysis via GET
        get_analysis_res = await client.get("/api/resumes/analysis", headers=headers)
        assert get_analysis_res.status_code == 200
        assert get_analysis_res.json()["atsScore"] == 88

        # 9. Delete resume and verify cleanup
        del_res = await client.delete(f"/api/resumes/{resume_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # Verify deleted from MongoDB and storage
        assert await db.resumes.find_one({"id": resume_id}) is None
        assert await db.resume_analyses.find_one({"resumeId": resume_id}) is None
        assert await storage.exists(resume_doc["storageKey"]) is False


@pytest.mark.asyncio
async def test_ai_error_handling(client):
    """Appropriate error responses on missing key, Groq failure, and malformed JSON."""
    uid, token = await register_test_user(client, "error.user@resumetest.io", "Error Candidate")
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = generate_test_pdf_bytes("Error Test Candidate Go Python Redis")
    upload_res = await client.post(
        "/api/resumes/upload",
        files={"file": ("Error_Test.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    resume_id = upload_res.json()["id"]

    # 1. Missing GROQ API Key -> 503
    with patch("app.config.settings.GROQ_API_KEY", ""):
        from app.services.ai_service import ResumeAiService
        with patch("app.routers.resumes.get_resume_ai_service", return_value=ResumeAiService(api_key="")):
            fail_res = await client.post(f"/api/resumes/{resume_id}/analyze", headers=headers)
            assert fail_res.status_code == 503
            assert "unavailable" in fail_res.json()["detail"].lower()

    # 2. Groq service exception / timeout -> 503
    test_ai_svc2 = ResumeAiService(api_key="gsk_valid_mock_key")
    with patch("app.routers.resumes.get_resume_ai_service", return_value=test_ai_svc2):
        with patch.object(
            test_ai_svc2,
            "_get_client",
        ) as mock_get_client2:
            mock_client2 = AsyncMock()
            mock_client2.chat.completions.create = AsyncMock(side_effect=Exception("Connection timed out to Groq cluster"))
            mock_get_client2.return_value = mock_client2

            fail_timeout = await client.post(f"/api/resumes/{resume_id}/analyze", headers=headers)
            assert fail_timeout.status_code == 503
            assert "unavailable" in fail_timeout.json()["detail"].lower()

    # 3. Malformed JSON from Groq -> 502
    class MockMessage:
        content = "Not a valid JSON response"

    class MockChoice:
        message = MockMessage()

    class MockBadResponse:
        choices = [MockChoice()]

    test_ai_svc3 = ResumeAiService(api_key="gsk_valid_mock_key")
    with patch("app.routers.resumes.get_resume_ai_service", return_value=test_ai_svc3):
        with patch.object(
            test_ai_svc3,
            "_get_client",
        ) as mock_get_client3:
            mock_client3 = AsyncMock()
            mock_client3.chat.completions.create = AsyncMock(return_value=MockBadResponse())
            mock_get_client3.return_value = mock_client3

            fail_bad_json = await client.post(f"/api/resumes/{resume_id}/analyze", headers=headers)
            assert fail_bad_json.status_code == 502
            assert "unparseable" in fail_bad_json.json()["detail"].lower()
