from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.schemas.application import (
    ApplicationCreate,
    ApplicationFilterQuery,
    ApplicationResponse,
    ApplicationStatsResponse,
    ApplicationUpdate,
)
from app.schemas.common import StandardSuccessResponse
from app.utils.helpers import utc_now_iso

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch live dashboard aggregation statistics for the authenticated seeker."""
    user_id = user["id"] if user else "guest_user"
    repo = ApplicationRepository(db)
    stats_dict = await repo.get_stats_for_user(user_id)
    return ApplicationStatsResponse(**stats_dict)


@router.get("", response_model=List[ApplicationResponse])
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status: Applied, Interview, Offer, Rejected"),
    priority: Optional[str] = Query(None, description="Filter by priority: High, Medium, Low"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    upcoming: Optional[bool] = Query(None, description="Filter for upcoming interviews or deadlines"),
    search: Optional[str] = Query(None, description="Search company, role, or notes"),
    limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch tracked job applications for the authenticated seeker."""
    repo = ApplicationRepository(db)
    user_id = user["id"] if user else "guest_user"
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
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single application strictly owned by the authenticated seeker."""
    repo = ApplicationRepository(db)
    user_id = user["id"] if user else "guest_user"
    doc = await repo.get_application_for_user(app_id, user_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return doc


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_data: ApplicationCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Submit a new job application record bound to the authenticated seeker."""
    repo = ApplicationRepository(db)
    doc_data = app_data.model_dump()
    user_id = user["id"] if user else "guest_user"
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
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing application stage, priority, or notes, ensuring ownership."""
    repo = ApplicationRepository(db)
    user_id = user["id"] if user else "guest_user"

    existing = await repo.get_application_for_user(app_id, user_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    update_dict = {k: v for k, v in app_data.model_dump().items() if v is not None}
    # Seeker permission check: seekers cannot self-promote to recruiter stages on job applications
    if existing.get("jobId") and update_dict.get("status") in ["Screening", "Shortlisted", "Offer", "Hired"]:
        user_role = user.get("role") if user else None
        if user_role not in ["recruiter", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seekers cannot modify recruiter-managed interview/offer stages.",
            )

    if update_dict.get("deadline") and not update_dict.get("deadlineDate"):
        update_dict["deadlineDate"] = update_dict["deadline"]
    elif update_dict.get("deadlineDate") and not update_dict.get("deadline"):
        update_dict["deadline"] = update_dict["deadlineDate"]

    updated = await repo.update_application_for_user(app_id, user_id, update_dict)
    return updated


@router.delete("/{app_id}", response_model=StandardSuccessResponse)
async def delete_application(
    app_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete an application record, ensuring ownership."""
    repo = ApplicationRepository(db)
    user_id = user["id"] if user else "guest_user"
    success = await repo.delete_application_for_user(app_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Application record deleted.")
