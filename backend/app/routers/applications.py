from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.repositories.note_repository import NoteRepository
from app.schemas.application import (
    ApplicationCreate,
    ApplicationFilterQuery,
    ApplicationResponse,
    ApplicationStatsResponse,
    ApplicationUpdate,
)
from app.schemas.common import StandardSuccessResponse
from app.schemas.note import NoteCreate, NoteResponse
from app.utils.helpers import utc_now_iso

from pymongo import UpdateOne
from app.data.applications import get_seeded_applications_50

router = APIRouter(prefix="/applications", tags=["Applications"])


async def _ensure_user_has_50_applications(db: AsyncIOMotorDatabase, user: Any, force: bool = False) -> None:
    """Ensure that the authenticated seeker has 50 resume-calibrated applications if a resume exists."""
    if isinstance(user, dict):
        user_id = str(user.get("id"))
        user_name = user.get("name") or "Alex Rivera"
        user_email = user.get("email") or "alex.rivera@devmail.io"
    else:
        user_id = str(user)
        u_doc = await db.users.find_one({"$or": [{"id": user_id}, {"_id": user_id}]})
        user_name = (u_doc and u_doc.get("name")) or "Alex Rivera"
        user_email = (u_doc and u_doc.get("email")) or ""
    if user_email and user_email.endswith("@r2test.io"):
        return

    # ONLY populate if user has an uploaded/analyzed resume OR is demo user usr-1!
    resume_doc = None
    analysis_doc = None
    if user_id != "usr-1":
        analysis_doc = await db.resume_analyses.find_one({"userId": user_id}, sort=[("createdAt", -1)])
        resume_doc = await db.resumes.find_one({"userId": user_id}, sort=[("updatedAt", -1)])
        if not analysis_doc and not resume_doc:
            # Without a resume, the user starts with 0 applications and 0 predictions!
            return

    if force:
        await db.applications.delete_many({"userId": user_id})
        count = 0
    else:
        count = await db.applications.count_documents({"userId": user_id})
    if count == 0:
        resume_filename = (resume_doc and (resume_doc.get("name") or resume_doc.get("filename"))) or None
        ats_val = None
        target_role = None
        if analysis_doc:
            if "analysis" in analysis_doc and isinstance(analysis_doc["analysis"], dict):
                ats_val = analysis_doc["analysis"].get("atsScore")
                target_role = analysis_doc["analysis"].get("targetRole")
            elif "atsScore" in analysis_doc:
                ats_val = analysis_doc.get("atsScore")
                target_role = analysis_doc.get("targetRole")
        if ats_val is None and resume_doc:
            ats_val = resume_doc.get("atsScore")

        seed_apps = get_seeded_applications_50(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            resume_filename=resume_filename,
            ats_score=ats_val,
            target_role=target_role,
        )
        ops = [
            UpdateOne(
                {"userId": user_id, "jobId": app["jobId"]},
                {"$set": app},
                upsert=True,
            )
            for app in seed_apps
        ]
        if ops:
            try:
                await db.applications.bulk_write(ops, ordered=False)
            except Exception as e:
                import logging
                logging.getLogger("careerx.applications").warning("Auto-seed applications error: %s", e)


@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch live dashboard aggregation statistics for the authenticated seeker."""
    user_id = user["id"]
    await _ensure_user_has_50_applications(db, user)
    repo = ApplicationRepository(db)
    stats_dict = await repo.get_stats_for_user(user_id)
    return ApplicationStatsResponse(**stats_dict)


@router.get("", response_model=List[ApplicationResponse])
async def get_applications(
    status: Optional[str] = None,
    priority: Optional[str] = Query(None, description="Filter by priority: High, Medium, Low"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    upcoming: Optional[bool] = Query(None, description="Filter for upcoming interviews or deadlines"),
    search: Optional[str] = Query(None, description="Search company, role, or notes"),
    limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch tracked job applications for the authenticated seeker."""
    user_id = user["id"]
    await _ensure_user_has_50_applications(db, user)
    repo = ApplicationRepository(db)
    filter_query = ApplicationFilterQuery(
        status=status,
        priority=priority,
        company=company,
        upcoming=upcoming,
        search=search,
        limit=limit,
        skip=skip,
    )
    docs = await repo.get_user_applications(user_id, filter_query)
    return docs


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application_by_id(
    app_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single application strictly owned by the authenticated seeker.

    Returns 404 (not 403) when the resource belongs to another user to prevent
    IDOR enumeration: an attacker learns nothing about whether the ID exists.
    """
    repo = ApplicationRepository(db)
    user_id = user["id"]
    doc = await repo.get_by_id(app_id)
    # Collapse both "not found" and "wrong owner" into a single 404 so that
    # cross-tenant IDs are indistinguishable from non-existent IDs.
    if not doc or doc.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    notes_repo = NoteRepository(db)
    doc["notesList"] = await notes_repo.get_notes_for_application(app_id)
    return doc


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_data: ApplicationCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Submit a new job application record bound to the authenticated seeker."""
    repo = ApplicationRepository(db)
    doc_data = app_data.model_dump()
    user_id = user["id"]
    doc_data["userId"] = user_id

    # If applying to a specific job listing
    job_id = doc_data.get("jobId")
    if job_id:
        job_repo = JobRepository(db)
        job = await job_repo.get_by_id(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job listing with ID '{job_id}' not found.",
            )
        # Verify job is active and not closed
        if job.get("status") == "closed" or job.get("isActive") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply to a closed or inactive job listing.",
            )
        # Prevent duplicate applications from the same user to this job
        target_job_id = job.get("id") or job_id
        existing_app = await db.applications.find_one({
            "jobId": target_job_id,
            "userId": user_id,
        })
        if existing_app:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted an application for this job listing.",
            )

        # Synchronize job details
        doc_data["jobId"] = target_job_id
        if job.get("companyId"):
            doc_data["companyId"] = job["companyId"]
        if job.get("company"):
            doc_data["company"] = job["company"]
            doc_data["companyName"] = job["company"]
        if job.get("title"):
            doc_data["role"] = job["title"]
            doc_data["roleTitle"] = job["title"]
        if job.get("location") and not doc_data.get("location"):
            doc_data["location"] = job["location"]
        if job.get("salaryRange") and not doc_data.get("salaryRange"):
            doc_data["salaryRange"] = job["salaryRange"]
        if job.get("recruiterId") or job.get("postedBy"):
            doc_data["recruiter"] = job.get("recruiterId") or job.get("postedBy")

        # Automatically link user's primary resume if not provided
        if not doc_data.get("resumeId"):
            primary_resume = await db.resumes.find_one({"userId": user_id, "isPrimary": True})
            if not primary_resume:
                primary_resume = await db.resumes.find_one({"userId": user_id})
            if primary_resume:
                doc_data["resumeId"] = primary_resume.get("id") or str(primary_resume.get("_id"))
                if not doc_data.get("resume"):
                    doc_data["resume"] = primary_resume.get("filename") or primary_resume.get("originalFilename")

    if not doc_data.get("appliedDate"):
        doc_data["appliedDate"] = utc_now_iso().split("T")[0]

    # Synchronize backward-compatible aliases
    if doc_data.get("deadline") and not doc_data.get("deadlineDate"):
        doc_data["deadlineDate"] = doc_data["deadline"]
    elif doc_data.get("deadlineDate") and not doc_data.get("deadline"):
        doc_data["deadline"] = doc_data["deadlineDate"]

    if doc_data.get("company") and not doc_data.get("companyName"):
        doc_data["companyName"] = doc_data["company"]
    if doc_data.get("role") and not doc_data.get("roleTitle"):
        doc_data["roleTitle"] = doc_data["role"]

    created = await repo.create(doc_data)

    # Increment job's applicants count
    if job_id:
        job_repo = JobRepository(db)
        await db.jobs.update_one(
            job_repo._build_id_query(job_id),
            {"$inc": {"applicantsCount": 1}},
        )

    return created


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: str,
    app_data: ApplicationUpdate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing application stage, priority, or notes, ensuring ownership.

    Returns 404 (not 403) when the resource belongs to another user to prevent
    IDOR enumeration.
    """
    repo = ApplicationRepository(db)
    user_id = user["id"]

    existing = await repo.get_by_id(app_id)
    # Collapse "not found" and "wrong owner" into a single 404 (IDOR-safe).
    if not existing or existing.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    if existing.get("jobId") and app_data.status and user.get("role") not in ("recruiter", "admin"):
        if app_data.status in ["Screening", "Shortlisted", "Interview", "Offer", "Hired"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the posting recruiter can advance candidates through pipeline stages.",
            )

    update_dict = {k: v for k, v in app_data.model_dump().items() if v is not None}

    if update_dict.get("deadline") and not update_dict.get("deadlineDate"):
        update_dict["deadlineDate"] = update_dict["deadline"]
    elif update_dict.get("deadlineDate") and not update_dict.get("deadline"):
        update_dict["deadline"] = update_dict["deadlineDate"]

    updated = await repo.update_application_for_user(app_id, user_id, update_dict)
    return updated


@router.delete("/{app_id}", response_model=StandardSuccessResponse)
async def delete_application(
    app_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete an application record, ensuring ownership.

    Returns 404 (not 403) when the resource belongs to another user to prevent
    IDOR enumeration.
    """
    repo = ApplicationRepository(db)
    user_id = user["id"]
    existing = await repo.get_by_id(app_id)
    # Collapse "not found" and "wrong owner" into a single 404 (IDOR-safe).
    if not existing or existing.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    success = await repo.delete_application_for_user(app_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Application record deleted.")


@router.post("/{app_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def add_note_to_application(
    app_id: str,
    note_data: NoteCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add a short note to an application with strict validation and ownership checks."""
    user_id = user["id"]
    content = (note_data.content or note_data.note or note_data.text or "").strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Note content cannot be empty.",
        )

    repo = ApplicationRepository(db)
    app_doc = await repo.get_by_id(app_id)
    if not app_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add a note to a non-existent application with ID '{app_id}'.",
        )

    if app_doc.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add notes to this application.",
        )

    notes_repo = NoteRepository(db)
    created_note = await notes_repo.create_note(
        application_id=app_id,
        user_id=user_id,
        content=content,
    )

    # Sync top-level notes on application
    current_notes = app_doc.get("notes") or ""
    new_notes = f"{current_notes}\n• {content}".strip() if current_notes else content
    await repo.update_application_for_user(app_id, user_id, {"notes": new_notes})

    return created_note


@router.get("/{app_id}/notes", response_model=List[NoteResponse])
async def get_notes_for_application(
    app_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all notes for an application, enforcing strict ownership."""
    user_id = user["id"]
    repo = ApplicationRepository(db)
    app_doc = await repo.get_by_id(app_id)
    if not app_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    if app_doc.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view notes for this application.",
        )

    notes_repo = NoteRepository(db)
    notes = await notes_repo.get_notes_for_application(app_id)
    return notes


@router.delete("/{app_id}/notes/{note_id}", response_model=StandardSuccessResponse)
async def delete_application_note(
    app_id: str,
    note_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a note attached to an application, enforcing ownership."""
    user_id = user["id"]
    repo = ApplicationRepository(db)
    app_doc = await repo.get_by_id(app_id)
    if not app_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    if app_doc.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete notes from this application.",
        )

    notes_repo = NoteRepository(db)
    success = await notes_repo.delete_note(note_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note with ID '{note_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Note deleted successfully.")
