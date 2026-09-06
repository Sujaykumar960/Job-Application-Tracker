import io
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
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
from app.storage import get_storage_backend
from app.utils.privacy import is_candidate_cloaked_from_recruiter

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


@router.get("/metrics", response_model=RecruiterMetrics)
async def get_recruiter_metrics(
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch recruiter top dashboard performance metrics calculated from MongoDB."""
    recruiter_id = user["id"]

    # 1. Total jobs posted by this recruiter
    job_cursor = db.jobs.find(
        {"$or": [{"recruiterId": recruiter_id}, {"userId": recruiter_id}]},
        {"id": 1}
    )
    jobs = await job_cursor.to_list(length=1000)
    jobs_posted = len(jobs)
    job_ids = [j["id"] for j in jobs if "id" in j]

    shortlisted_direct = await db.shortlists.count_documents({"recruiterId": recruiter_id})

    if not job_ids:
        return RecruiterMetrics(
            jobsPosted=jobs_posted,
            applicationsCount=0,
            shortlistedCount=shortlisted_direct,
            interviewsCount=0,
            hiredCount=0,
        )

    # 2. Real application counts across recruiter's jobs
    app_query = {"jobId": {"$in": job_ids}}
    total_apps = await db.applications.count_documents(app_query)

    shortlisted_apps = await db.applications.count_documents({
        "jobId": {"$in": job_ids},
        "status": {"$in": ["shortlisted", "reviewed", "screening"]}
    })

    interviews = await db.applications.count_documents({
        "jobId": {"$in": job_ids},
        "status": {"$in": ["interview", "interviewing", "technical", "onsite"]}
    })

    hired = await db.applications.count_documents({
        "jobId": {"$in": job_ids},
        "status": {"$in": ["offer", "accepted", "hired"]}
    })

    return RecruiterMetrics(
        jobsPosted=jobs_posted,
        applicationsCount=total_apps,
        shortlistedCount=shortlisted_apps + shortlisted_direct,
        interviewsCount=interviews,
        hiredCount=hired,
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


@router.get("/candidates/{candidate_id}/resume")
@router.get("/candidates/{candidate_id}/resume/download")
async def download_candidate_resume(
    candidate_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Download or stream a candidate's resume for an authorized recruiter.
    Strict privacy model enforcement:
      1. Role check: only 'recruiter' or 'admin' may invoke.
      2. searchStatus check: 'not_looking' candidates return 404 Not Found.
      3. Employer cloaking: cloaked candidates return 403 Forbidden.
      4. contactVisibility check:
         - 'hidden': returns 403 Forbidden.
         - 'mutual_matches': verifies mutual application/match before granting access (returns 403 if none).
         - 'all_recruiters': authorized.
      5. Streams either stored physical resume file or verified platform technical dossier.
    """
    repo = CandidateRepository(db)
    await repo.seed_if_empty()

    # 1. Fetch candidate
    candidate = await repo.get_by_id(candidate_id)
    if not candidate:
        # Check by user/profile ID
        prof = await db.profiles.find_one({"userId": candidate_id})
        user_doc = await db.users.find_one({"id": candidate_id})
        if prof or user_doc:
            candidate = {
                "id": candidate_id,
                "userId": candidate_id,
                "name": (user_doc or {}).get("name") or (prof or {}).get("name") or "Candidate",
                "role": (prof or {}).get("headline") or (prof or {}).get("title") or "Software Engineer",
                "location": (prof or {}).get("location") or "Remote",
                "skills": (prof or {}).get("skills") or [],
                "privacy": (prof or {}).get("privacy") or {},
                "activeResumeId": (user_doc or {}).get("activeResumeId") or (prof or {}).get("activeResumeId"),
                "atsScore": (user_doc or {}).get("atsScore") or (prof or {}).get("atsScore") or 85,
            }

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID '{candidate_id}' not found.",
        )

    # 2. Check candidate privacy policies
    privacy = candidate.get("privacy", {})

    # Privacy Rule A: 'not_looking' candidates are hidden and undiscoverable
    if privacy.get("searchStatus") == "not_looking":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID '{candidate_id}' not found.",
        )

    # Privacy Rule B: Employer Cloaking
    recruiter_id = user["id"]
    recruiter_company = user.get("company")
    if not recruiter_company:
        prof = await db.profiles.find_one({"userId": recruiter_id})
        if prof and prof.get("company"):
            recruiter_company = prof["company"]

    if is_candidate_cloaked_from_recruiter(privacy, recruiter_company):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Candidate profile and resume are confidential under employer cloaking policy.",
        )

    # Privacy Rule C: Contact & Resume Visibility
    contact_visibility = privacy.get("contactVisibility", "all_recruiters")
    if contact_visibility == "hidden":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Candidate has set direct resume and contact visibility to hidden.",
        )

    if contact_visibility == "mutual_matches":
        candidate_user_id = candidate.get("userId") or candidate.get("id")
        is_mutual = False

        if recruiter_company:
            company_pattern = re.escape(recruiter_company.strip())
            app_doc = await db.applications.find_one({
                "userId": candidate_user_id,
                "$or": [
                    {"company": {"$regex": f"^{company_pattern}$", "$options": "i"}},
                    {"companyName": {"$regex": f"^{company_pattern}$", "$options": "i"}},
                ],
            })
            if app_doc:
                is_mutual = True

        if not is_mutual:
            interaction = await db.recruiter_interactions.find_one({
                "recruiterId": recruiter_id,
                "candidateId": candidate_id,
            })
            if interaction and (
                interaction.get("isShortlisted")
                or interaction.get("interviewStage") not in [None, "Not Started"]
            ):
                is_mutual = True

        if not is_mutual:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Candidate resume is only accessible upon mutual match or application.",
            )

    # 3. Resolve candidate resume
    candidate_user_id = candidate.get("userId") or candidate.get("id")
    active_resume_id = candidate.get("activeResumeId")

    resume_doc = None
    if active_resume_id:
        resume_doc = await db.resumes.find_one({"id": active_resume_id})

    if not resume_doc and candidate_user_id:
        resume_doc = await db.resumes.find_one({"userId": candidate_user_id, "isActive": True})
    if not resume_doc and candidate_user_id:
        resume_doc = await db.resumes.find_one({"userId": candidate_user_id, "isPrimary": True})
    if not resume_doc and candidate_user_id:
        resume_doc = await db.resumes.find_one({"userId": candidate_user_id}, sort=[("createdAt", -1)])

    if resume_doc and resume_doc.get("storageKey"):
        storage = get_storage_backend()
        if await storage.exists(resume_doc["storageKey"]):
            content_type = resume_doc.get("contentType") or "application/pdf"
            filename = resume_doc.get("originalFilename") or resume_doc.get("filename") or f"Resume_{candidate_id}.pdf"
            headers = {"Content-Disposition": f'inline; filename="{filename}"'}
            if resume_doc.get("fileSizeBytes"):
                headers["Content-Length"] = str(resume_doc["fileSizeBytes"])
            return StreamingResponse(
                storage.get_stream(resume_doc["storageKey"]),
                media_type=content_type,
                headers=headers,
            )

    # 4. Fallback for seeded verified platform candidates without stored binary file
    cand_name = candidate.get("name") or "Candidate"
    clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", cand_name)
    salary_str = (
        privacy.get("salaryExpectation", "Not Disclosed")
        if privacy.get("showSalary", True)
        else "[Confidential]"
    )
    email_str = privacy.get("email", "Platform Messenger")
    skills_str = ", ".join(candidate.get("skills", []))
    projects_str = ", ".join(candidate.get("featuredProjects", []))

    dossier_text = f"""=======================================================
CareerX Verified Candidate Technical Dossier & Resume
=======================================================
Candidate Name:          {cand_name}
Target Role:             {candidate.get('role', 'Software Engineer')}
Location:                {candidate.get('location', 'Remote')}
Seniority / Experience:  {candidate.get('yearsExperience') or candidate.get('experienceLevel', 'N/A')}
ATS Compatibility Score: {candidate.get('atsScore', 'N/A')}%

--- TECHNICAL VERIFICATION METRICS ---
Standardized Assessment: {candidate.get('assessmentName', 'Backend Systems Exam')}
Assessment Score:        {candidate.get('assessmentScore', 'N/A')}% ({candidate.get('assessmentPercentile', '')})
Coding Practice Solved:  {candidate.get('questionsSolved', 0)} / {candidate.get('totalQuestions', 0)} ({candidate.get('accuracy', 0)}% 1st-Submit Accuracy)
Current Activity Streak: {candidate.get('streak', 0)} Days

--- CORE COMPETENCIES & SKILLS ---
{skills_str if skills_str else 'N/A'}

--- VERIFIED REPOSITORIES & PROJECTS ---
{projects_str if projects_str else 'N/A'}

--- COMPENSATION & CONTACT DIRECTIVES ---
Target Compensation:     {salary_str}
Direct Contact:          {email_str}
=======================================================
Verified by CareerX Verification Engine
"""
    return StreamingResponse(
        io.BytesIO(dossier_text.encode("utf-8")),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="Verified_Resume_{clean_name}.txt"'},
    )
