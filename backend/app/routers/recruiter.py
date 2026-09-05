from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, require_role
from app.repositories.candidate_repository import CandidateRepository
from app.schemas.recruiter import (
    CandidateFilterQuery,
    CandidateStageUpdatePayload,
    RecruiterCandidate,
    RecruiterMetrics,
    ShortlistResponse,
)

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


@router.get("/metrics", response_model=RecruiterMetrics)
async def get_recruiter_metrics(
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch recruiter top dashboard performance metrics (Recruiter Only)."""
    return RecruiterMetrics(
        jobsPosted=6,
        applicationsCount=148,
        shortlistedCount=12,
        interviewsCount=8,
        hiredCount=5,
    )


@router.get("/candidates", response_model=List[RecruiterCandidate])
async def search_candidates(
    response: Response,
    search: Optional[str] = Query(None, description="Free-text search across name, role, skills, location"),
    skills: Optional[str] = Query(None, description="Filter by technical skill"),
    experienceLevel: Optional[str] = Query(None, description="Filter by seniority level"),
    experience: Optional[str] = Query(None, description="Seniority level alias"),
    location: Optional[str] = Query(None, description="Filter by location"),
    jobMatch: Optional[int] = Query(None, description="Minimum job match score"),
    minJobMatch: Optional[int] = Query(None, description="Minimum job match score alias"),
    atsScore: Optional[int] = Query(None, description="Minimum ATS score"),
    assessmentScore: Optional[int] = Query(None, description="Minimum assessment score"),
    minAssessmentScore: Optional[int] = Query(None, description="Minimum assessment score alias"),
    searchStatus: Optional[str] = Query(None, description="Filter by searchStatus: actively_looking, casually_browsing"),
    role: Optional[str] = Query(None, description="Filter by target role"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    page: Optional[int] = Query(None, ge=1),
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Search candidate discovery pool with 7-parameter filters and privacy cloaking (Recruiter Only)."""
    query = CandidateFilterQuery(
        search=search,
        skills=skills,
        experienceLevel=experienceLevel or experience,
        location=location,
        jobMatch=jobMatch or minJobMatch,
        atsScore=atsScore,
        assessmentScore=assessmentScore or minAssessmentScore,
        searchStatus=searchStatus,
        role=role,
        limit=limit,
        skip=skip,
        page=page,
    )
    repo = CandidateRepository(db)
    recruiter_id = user["id"]
    recruiter_company = user.get("company")
    if not recruiter_company:
        prof = await db.profiles.find_one({"userId": recruiter_id})
        if prof and prof.get("company"):
            recruiter_company = prof["company"]

    results = await repo.search_candidates(query, recruiter_id=recruiter_id, recruiter_company=recruiter_company)
    response.headers["X-Total-Count"] = str(len(results))
    return results


@router.get("/candidates/{candidate_id}", response_model=RecruiterCandidate)
async def get_candidate_by_id(
    candidate_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch candidate dossier by ID with strict employer cloaking and privacy rules (Recruiter Only)."""
    repo = CandidateRepository(db)
    recruiter_id = user["id"]
    recruiter_company = user.get("company")
    if not recruiter_company:
        prof = await db.profiles.find_one({"userId": recruiter_id})
        if prof and prof.get("company"):
            recruiter_company = prof["company"]

    doc = await repo.get_candidate_details(candidate_id, recruiter_id=recruiter_id, recruiter_company=recruiter_company)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID '{candidate_id}' not found.",
        )
    return doc


@router.post("/candidates/{candidate_id}/shortlist", response_model=ShortlistResponse)
async def shortlist_candidate(
    candidate_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add candidate to recruiter's shortlist (Recruiter Only)."""
    repo = CandidateRepository(db)
    is_shortlisted = await repo.shortlist_candidate(user["id"], candidate_id)
    return ShortlistResponse(isShortlisted=is_shortlisted)


@router.delete("/candidates/{candidate_id}/shortlist", response_model=ShortlistResponse)
async def unshortlist_candidate(
    candidate_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove candidate from recruiter's shortlist (Recruiter Only)."""
    repo = CandidateRepository(db)
    is_shortlisted = await repo.unshortlist_candidate(user["id"], candidate_id)
    return ShortlistResponse(isShortlisted=is_shortlisted)


@router.patch("/candidates/{candidate_id}/stage")
@router.post("/candidates/{candidate_id}/stage")
@router.patch("/candidates/{candidate_id}/interview-stage")
@router.post("/candidates/{candidate_id}/interview-stage")
async def update_candidate_stage(
    candidate_id: str,
    body: CandidateStageUpdatePayload,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update candidate interview stage for this recruiter (Recruiter Only)."""
    repo = CandidateRepository(db)
    res = await repo.update_interview_stage(user["id"], candidate_id, body.stage, body.notes)
    return {
        "success": True,
        "candidateId": candidate_id,
        "interviewStage": body.stage,
        "interaction": res,
    }
