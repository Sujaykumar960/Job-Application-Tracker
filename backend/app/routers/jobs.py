from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db, get_optional_user, require_role
from app.repositories.job_repository import JobRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.job import (
    JobCreate,
    JobFilterQuery,
    JobMatchAnalysis,
    JobResponse,
    JobUpdate,
)
from app.services.matching_service import (
    calculate_job_match,
    get_candidate_skills,
    normalize_skill,
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobResponse])
async def get_jobs(
    response: Response,
    search: Optional[str] = Query(None, description="Search across title, company, description"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    location: Optional[str] = Query(None, description="Filter by job location"),
    experienceLevel: Optional[str] = Query(None, description="Filter by experience level"),
    experience: Optional[str] = Query(None, description="Alias for experienceLevel"),
    roleCategory: Optional[str] = Query(None, description="Filter by role category"),
    role: Optional[str] = Query(None, description="Alias for roleCategory"),
    workType: Optional[str] = Query(None, description="Filter by work type: Remote, Hybrid, On-site"),
    jobType: Optional[str] = Query(None, description="Filter by job type: Full-time, Internship, Contract"),
    skills: Optional[str] = Query(None, description="Filter by required/preferred skills"),
    skill: Optional[str] = Query(None, description="Alias for skills"),
    minSalary: Optional[int] = Query(None, description="Filter minimum salary"),
    maxSalary: Optional[int] = Query(None, description="Filter maximum salary"),
    sortBy: Optional[str] = Query("newest", description="Sort by newest, salary, or match"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    skip: int = Query(0, ge=0, description="Items to skip"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch job listings with 10-parameter multi-facet filtering and pagination."""
    repo = JobRepository(db)
    filter_q = JobFilterQuery(
        search=search,
        company=company,
        location=location,
        experienceLevel=experienceLevel or experience,
        roleCategory=roleCategory or role,
        workType=workType,
        jobType=jobType,
        skills=skills or skill,
        minSalary=minSalary,
        maxSalary=maxSalary,
        sortBy=sortBy,
        limit=limit,
        skip=skip,
        page=page,
    )

    total_count = await repo.count_jobs(filter_q)
    candidate_skills = []
    if user:
        cand_set, _, _, _ = await get_candidate_skills(db, user["id"])
        candidate_skills = list(cand_set)
    docs = await repo.search_jobs(filter_q, candidate_skills=candidate_skills)
    if filter_q.sortBy == "match":
        docs.sort(key=lambda j: j.get("matchScore", 0), reverse=True)

    # Set pagination response headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Limit"] = str(limit)
    active_page = page if page is not None else (skip // limit) + 1
    response.headers["X-Page"] = str(active_page)
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    response.headers["X-Total-Pages"] = str(max(1, total_pages))

    return docs


@router.get("/matches", response_model=List[JobResponse])
async def get_recommended_job_matches(
    limit: int = Query(20, ge=1, le=50, description="Number of matches to return"),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve active jobs ranked by deterministic match score for the authenticated user."""
    repo = JobRepository(db)
    cand_set, _, _, _ = await get_candidate_skills(db, user["id"])
    filter_q = JobFilterQuery(limit=100)
    docs = await repo.search_jobs(filter_q, candidate_skills=list(cand_set))
    docs.sort(key=lambda j: j.get("matchScore", 0), reverse=True)
    return docs[:limit]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(
    job_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single job details by ID."""
    repo = JobRepository(db)
    doc = await repo.get_by_id(job_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    # Compute skill match against viewing user
    cand_set = set()
    if user:
        cand_set, _, _, _ = await get_candidate_skills(db, user["id"])
    skills = doc.get("skills", [])
    for s in skills:
        if isinstance(s, dict) and "name" in s:
            s["isMatched"] = normalize_skill(s["name"]) in cand_set
    doc["skills"] = skills

    if cand_set and skills:
        matched_count = sum(1 for s in skills if isinstance(s, dict) and s.get("isMatched"))
        doc["matchScore"] = min(100, max(0, int((matched_count / len(skills)) * 100)))
    else:
        doc["matchScore"] = 0

    return doc


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Post a new job listing (Recruiter/Admin only). Enforces server-authoritative recruiter ownership."""
    repo = JobRepository(db)
    doc_data = job_data.model_dump()
    # Server-authoritatively assign ownership to the authenticated recruiter
    doc_data["recruiterId"] = user["id"]
    doc_data["postedBy"] = user["id"]
    if not doc_data.get("status"):
        doc_data["status"] = "published"
    created = await repo.create(doc_data)
    return created


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing job listing (Recruiter/Admin only). Enforces recruiter ownership."""
    repo = JobRepository(db)
    existing = await repo.get_by_id(job_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    # Ownership check: non-admins can only modify their own jobs
    if user.get("role") != "admin":
        owner_id = existing.get("recruiterId") or existing.get("postedBy")
        if owner_id and owner_id != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only modify job listings that you created.",
            )

    update_dict = {k: v for k, v in job_data.model_dump().items() if v is not None}
    # Forbid tampering with immutable ownership fields
    update_dict.pop("id", None)
    update_dict.pop("recruiterId", None)
    update_dict.pop("postedBy", None)

    # If closing the job, ensure isActive mirrors status
    if update_dict.get("status") == "closed":
        update_dict["isActive"] = False
    elif update_dict.get("status") == "published" and "isActive" not in update_dict:
        update_dict["isActive"] = True

    updated = await repo.update(job_id, update_dict)
    return updated


@router.delete("/{job_id}", response_model=StandardSuccessResponse)
async def delete_job(
    job_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a job listing (Recruiter/Admin only). Enforces recruiter ownership."""
    repo = JobRepository(db)
    existing = await repo.get_by_id(job_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    # Ownership check: non-admins can only delete their own jobs
    if user.get("role") != "admin":
        owner_id = existing.get("recruiterId") or existing.get("postedBy")
        if owner_id and owner_id != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only delete job listings that you created.",
            )

    success = await repo.delete(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Job listing successfully deleted.")


@router.post("/{job_id}/match", response_model=JobMatchAnalysis)
async def analyze_job_match(
    job_id: str,
    resumeId: Optional[str] = Query(None, description="Optional resume ID to analyze against"),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Analyze authenticated candidate profile compatibility against job description."""
    repo = JobRepository(db)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    candidate_skills, _, target_resume, _ = await get_candidate_skills(
        db, user["id"], resume_id=resumeId
    )

    match_result = calculate_job_match(
        candidate_skills=candidate_skills,
        job=job,
        candidate_exp=user.get("experienceLevel", "Mid"),
        candidate_loc=user.get("location", "Remote"),
        target_resume=target_resume,
    )

    return match_result

