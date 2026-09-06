import pytest
import pytest_asyncio
import httpx
from pydantic import ValidationError

from app.database import DatabaseManager
from app.main import app
from app.schemas.resume import ResumeAnalysisResult, ResumeDocument
from app.scripts.migrate_resumes import run_resume_migration
from app.scripts.verify_resumes import run_resume_verification


@pytest_asyncio.fixture
async def setup_db():
    await DatabaseManager.connect()
    db = DatabaseManager.db
    # Clean test collections
    if db is not None:
        await db.resumes.delete_many({})
        await db.resume_analyses.delete_many({})
        await db.files.delete_many({})
        await db.users.delete_many({})
        await db.quarantine_resumes.delete_many({})
        await db.quarantine_resume_analyses.delete_many({})
    yield db
    if db is not None:
        await db.resumes.delete_many({})
        await db.resume_analyses.delete_many({})
        await db.files.delete_many({})
        await db.users.delete_many({})
        await db.quarantine_resumes.delete_many({})
        await db.quarantine_resume_analyses.delete_many({})


@pytest.mark.asyncio
async def test_migration_classifies_and_handles_all_5_categories(setup_db):
    db = setup_db

    # User Alice & Bob
    alice_id = "user_alice_123"
    bob_id = "user_bob_456"

    # 1. Correctly owned records (Class 1)
    await db.resumes.insert_one({
        "id": "res_alice_clean",
        "userId": alice_id,
        "filename": "alice_cv.pdf",
        "storageKey": f"resumes/{alice_id}/res_alice_clean/alice_cv.pdf",
        "createdAt": "2026-09-01T00:00:00Z",
    })
    await db.resume_analyses.insert_one({
        "id": "ana_alice_clean",
        "userId": alice_id,
        "resumeId": "res_alice_clean",
        "atsScore": 90,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # 2. Clearly attributable records (Class 2)
    # A) Resume with ownerId instead of userId
    await db.resumes.insert_one({
        "id": "res_bob_ownerid",
        "ownerId": bob_id,
        "filename": "bob_cv.pdf",
        "storageKey": f"resumes/{bob_id}/res_bob_ownerid/bob_cv.pdf",
        "createdAt": "2026-09-01T00:00:00Z",
    })
    # B) Analysis linked to alice's resume but missing analysis.userId
    await db.resume_analyses.insert_one({
        "id": "ana_alice_missing_userid",
        "resumeId": "res_alice_clean",
        "atsScore": 88,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # 3. Orphaned records (Class 3)
    # A) Resume with no identifiable user
    await db.resumes.insert_one({
        "id": "res_orphan_no_user",
        "filename": "orphan.pdf",
        "storageKey": "resumes/unknown/res_orphan_no_user/orphan.pdf",
        "createdAt": "2026-09-01T00:00:00Z",
    })
    # B) Analysis pointing to non-existent resume
    await db.resume_analyses.insert_one({
        "id": "ana_orphan_no_resume",
        "userId": "some_lost_user",
        "resumeId": "non_existent_resume_999",
        "atsScore": 75,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # 4. Global / mock records (Class 4)
    await db.resumes.insert_one({
        "id": "mock-resume-global-1",
        "userId": "global",
        "filename": "global_demo.pdf",
        "storageKey": "resumes/global/mock-resume-global-1/global_demo.pdf",
        "createdAt": "2026-09-01T00:00:00Z",
    })
    await db.resume_analyses.insert_one({
        "id": "global-analysis-1",
        "userId": "mock",
        "resumeId": "mock-resume-global-1",
        "atsScore": 85,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # 5. Mismatched records (Analysis user != Resume user)
    await db.resume_analyses.insert_one({
        "id": "ana_mismatched_users",
        "userId": bob_id,
        "resumeId": "res_alice_clean",  # Belongs to Alice!
        "atsScore": 80,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # --- Pre-migration verification report ---
    pre_report = await run_resume_verification(db)
    assert pre_report["is_clean"] is False
    assert pre_report["summary"]["resumes_without_userId"] >= 2
    assert pre_report["summary"]["analyses_without_userId"] >= 1
    assert pre_report["summary"]["mismatched_userId_relationships"] >= 1

    # --- Run Migration ---
    mig_report = await run_resume_migration(db, dry_run=False)

    assert mig_report["resumes"]["correctly_owned"] == 1
    assert mig_report["resumes"]["attributed_migrated"] == 1
    assert mig_report["resumes"]["quarantined_orphaned"] == 1
    assert mig_report["resumes"]["quarantined_mock"] == 1

    assert mig_report["analyses"]["correctly_owned"] == 1
    assert mig_report["analyses"]["attributed_migrated"] == 1
    assert mig_report["analyses"]["quarantined_orphaned"] == 1
    assert mig_report["analyses"]["quarantined_mock"] == 1
    assert mig_report["analyses"]["quarantined_mismatched"] == 1

    # --- Verify Active DB State After Migration ---
    # 1. Attributed resume is migrated
    bob_migrated = await db.resumes.find_one({"id": "res_bob_ownerid"})
    assert bob_migrated is not None
    assert bob_migrated["userId"] == bob_id

    # 2. Attributed analysis is migrated
    alice_ana_migrated = await db.resume_analyses.find_one({"id": "ana_alice_missing_userid"})
    assert alice_ana_migrated is not None
    assert alice_ana_migrated["userId"] == alice_id

    # 3. Orphaned and mock records removed from active collections and present in quarantine
    assert await db.resumes.find_one({"id": "res_orphan_no_user"}) is None
    assert await db.resumes.find_one({"id": "mock-resume-global-1"}) is None
    assert await db.quarantine_resumes.find_one({"id": "res_orphan_no_user"}) is not None
    assert await db.quarantine_resumes.find_one({"id": "mock-resume-global-1"}) is not None

    assert await db.resume_analyses.find_one({"id": "ana_orphan_no_resume"}) is None
    assert await db.resume_analyses.find_one({"id": "global-analysis-1"}) is None
    assert await db.resume_analyses.find_one({"id": "ana_mismatched_users"}) is None
    assert await db.quarantine_resume_analyses.find_one({"id": "ana_orphan_no_resume"}) is not None
    assert await db.quarantine_resume_analyses.find_one({"id": "ana_mismatched_users"}) is not None

    # --- Post-migration verification report ---
    post_report = await run_resume_verification(db)
    assert post_report["is_clean"] is True
    assert post_report["summary"]["resumes_without_userId"] == 0
    assert post_report["summary"]["analyses_without_userId"] == 0
    assert post_report["summary"]["analyses_without_resumeId"] == 0
    assert post_report["summary"]["mismatched_userId_relationships"] == 0
    assert post_report["summary"]["quarantined_resumes_count"] >= 2
    assert post_report["summary"]["quarantined_analyses_count"] >= 3


@pytest.mark.asyncio
async def test_migration_idempotency(setup_db):
    """Ensure running the migration multiple consecutive times produces identical state without re-mutating or duplicating."""
    db = setup_db
    user_id = "user_charlie_789"

    await db.resumes.insert_one({
        "id": "res_charlie_1",
        "ownerId": user_id,  # Needs migration
        "filename": "charlie.pdf",
        "storageKey": f"resumes/{user_id}/res_charlie_1/charlie.pdf",
        "createdAt": "2026-09-01T00:00:00Z",
    })
    await db.resume_analyses.insert_one({
        "id": "ana_charlie_1",
        "resumeId": "res_charlie_1",
        "atsScore": 92,
        "createdAt": "2026-09-01T00:00:00Z",
    })

    # Run 1
    run1 = await run_resume_migration(db, dry_run=False)
    assert run1["resumes"]["attributed_migrated"] == 1
    assert run1["analyses"]["attributed_migrated"] == 1

    # Run 2 (Should find 0 unmigrated records, everything is correctly owned)
    run2 = await run_resume_migration(db, dry_run=False)
    assert run2["resumes"]["scanned"] == 1
    assert run2["resumes"]["correctly_owned"] == 1
    assert run2["resumes"]["attributed_migrated"] == 0
    assert run2["resumes"]["quarantined_orphaned"] == 0

    assert run2["analyses"]["scanned"] == 1
    assert run2["analyses"]["correctly_owned"] == 1
    assert run2["analyses"]["attributed_migrated"] == 0
    assert run2["analyses"]["quarantined_orphaned"] == 0

    # Verification confirms clean
    verify = await run_resume_verification(db)
    assert verify["is_clean"] is True


@pytest.mark.asyncio
async def test_resume_and_analysis_documents_require_userId_and_resumeId():
    """Ensure ResumeDocument and ResumeAnalysisDocument schemas strictly enforce userId and resumeId."""
    from app.schemas.resume import ResumeAnalysisDocument, ResumeDocument

    # 1. Valid ResumeDocument
    valid_resume = ResumeDocument(
        id="res_123",
        userId="user_123",
        filename="cv.pdf",
        originalFilename="cv.pdf",
        storageKey="resumes/user_123/res_123/cv.pdf",
        uploadedAt="2026-09-01T00:00:00Z",
        createdAt="2026-09-01T00:00:00Z",
    )
    assert valid_resume.userId == "user_123"

    # Missing userId in ResumeDocument raises ValidationError
    with pytest.raises(ValidationError):
        ResumeDocument(
            id="res_123",
            filename="cv.pdf",
            originalFilename="cv.pdf",
            storageKey="resumes/user_123/res_123/cv.pdf",
            uploadedAt="2026-09-01T00:00:00Z",
            createdAt="2026-09-01T00:00:00Z",
        )

    # 2. Valid ResumeAnalysisDocument
    valid_analysis = ResumeAnalysisDocument(
        id="ana_123",
        userId="user_123",
        resumeId="res_123",
        analyzedAt="2026-09-01T00:00:00Z",
        createdAt="2026-09-01T00:00:00Z",
    )
    assert valid_analysis.userId == "user_123"
    assert valid_analysis.resumeId == "res_123"

    # Missing userId or resumeId raises ValidationError
    with pytest.raises(ValidationError):
        ResumeAnalysisDocument(
            id="ana_123",
            analyzedAt="2026-09-01T00:00:00Z",
            createdAt="2026-09-01T00:00:00Z",
        )

    with pytest.raises(ValidationError):
        ResumeAnalysisDocument(
            id="ana_123",
            userId="user_123",
            analyzedAt="2026-09-01T00:00:00Z",
            createdAt="2026-09-01T00:00:00Z",
        )
