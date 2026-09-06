from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user, require_role
from app.repositories.job_repository import JobRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.job import (
    JobCreate,
    JobFilterQuery,
    JobMatchAnalysis,
    JobResponse,
    JobUpdate,
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
    candidate_skills = user.get("skills", []) if user else []
    docs = await repo.search_jobs(filter_q, candidate_skills=candidate_skills)

    # Set pagination response headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Limit"] = str(limit)
    active_page = page if page is not None else (skip // limit) + 1
    response.headers["X-Page"] = str(active_page)
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    response.headers["X-Total-Pages"] = str(max(1, total_pages))

    return docs


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
    candidate_skills_set = {s.lower() for s in user.get("skills", [])} if user else set()
    skills = doc.get("skills", [])
    for s in skills:
        if isinstance(s, dict) and "name" in s:
            s["isMatched"] = s["name"].lower() in candidate_skills_set
    doc["skills"] = skills

    return doc


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Post a new job listing (Recruiter/Admin only)."""
    if user is not None and user.get("role") not in ["recruiter", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Only recruiters and administrators can create job listings.",
        )
    repo = JobRepository(db)
    doc_data = job_data.model_dump()
    created = await repo.create(doc_data)
    return created


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing job listing (Recruiter/Admin only)."""
    if user is not None and user.get("role") not in ["recruiter", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Only recruiters and administrators can modify job listings.",
        )
    repo = JobRepository(db)
    existing = await repo.get_by_id(job_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    update_dict = {k: v for k, v in job_data.model_dump().items() if v is not None}
    updated = await repo.update(job_id, update_dict)
    return updated


@router.delete("/{job_id}", response_model=StandardSuccessResponse)
async def delete_job(
    job_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a job listing (Recruiter/Admin only)."""
    if user is not None and user.get("role") not in ["recruiter", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Only recruiters and administrators can delete job listings.",
        )
    repo = JobRepository(db)
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
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Analyze real user candidate skills compatibility against real job requirements."""
    repo = JobRepository(db)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    # 1. Gather job required skills
    raw_skills = job.get("skills", [])
    req_skills = job.get("requiredSkills", [])
    job_skills_list: List[str] = []

    for s in raw_skills:
        if isinstance(s, dict) and "name" in s:
            job_skills_list.append(s["name"])
        elif isinstance(s, str):
            job_skills_list.append(s)
    for s in req_skills:
        if isinstance(s, str) and s not in job_skills_list:
            job_skills_list.append(s)

    # If job has no listed skills, return notice
    if not job_skills_list:
        return JobMatchAnalysis(
            matchScore=0,
            matchedSkills=[],
            missingSkills=[],
            recommendations=["This job listing does not currently specify required technical skills."],
        )

    # 2. Gather user skills from profile and active resume
    user_skills: List[str] = []
    if user:
        user_id = user["id"]
        prof = await db.profiles.find_one({"userId": user_id}) or {}
        user_skills.extend(prof.get("skills", []))

        # Check latest resume analysis
        latest_analysis = await db.resume_analyses.find_one(
            {"userId": user_id},
            sort=[("createdAt", -1)],
        )
        if latest_analysis:
            user_skills.extend(latest_analysis.get("hardSkills", []))
            extracted = latest_analysis.get("extractedSkills", {})
            if isinstance(extracted, dict):
                for cat_skills in extracted.values():
                    if isinstance(cat_skills, list):
                        user_skills.extend(cat_skills)

    user_skills_lower = {s.strip().lower() for s in user_skills if isinstance(s, str)}

    if not user or not user_skills_lower:
        return JobMatchAnalysis(
            matchScore=0,
            matchedSkills=[],
            missingSkills=job_skills_list,
            recommendations=[
                "Add your technical skills to your profile or upload a resume to calculate an accurate compatibility score.",
                "Review the listed required skills before applying.",
            ],
        )

    # 3. Calculate real matching vs missing
    matched: List[str] = []
    missing: List[str] = []

    for skill in job_skills_list:
        if skill.strip().lower() in user_skills_lower:
            matched.append(skill)
        else:
            missing.append(skill)

    match_score = int(round((len(matched) / len(job_skills_list)) * 100))

    recommendations: List[str] = []
    if missing:
        recommendations.extend([
            f"Strengthen your qualification by learning or adding projects showcasing {skill}."
            for skill in missing[:3]
        ])
    else:
        recommendations.append("You match all required skills for this position! Consider tailoring your cover letter.")

    return JobMatchAnalysis(
        matchScore=match_score,
        matchedSkills=matched,
        missingSkills=missing,
        recommendations=recommendations,
    )
