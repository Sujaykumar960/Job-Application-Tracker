import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, require_role
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.schemas.application import ApplicationResponse, normalize_status
from app.schemas.job import JobResponse
from app.schemas.recruiter import (
    CandidateFilterQuery,
    CandidateStageUpdatePayload,
    RecruiterApplicationStatusUpdate,
    RecruiterCandidate,
    RecruiterMetrics,
    ShortlistResponse,
)
from bson import ObjectId
from app.storage import get_storage_backend
from app.utils.helpers import utc_now_iso

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


def _build_mongo_id_query(id_val: Any) -> Dict[str, Any]:
    if not id_val:
        return {"id": "__empty__"}
    s_id = str(id_val)
    if ObjectId.is_valid(s_id):
        return {"$or": [{"_id": ObjectId(s_id)}, {"id": s_id}]}
    return {"id": s_id}


@router.get("/metrics", response_model=RecruiterMetrics)
async def get_recruiter_metrics(
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch recruiter top dashboard performance metrics (Recruiter Only)."""
    recruiter_id = user["id"]
    recruiter_company = user.get("company")

    # 1. Jobs posted query
    job_filters = [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]
    if recruiter_company:
        job_filters.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})
    job_q = {"$or": job_filters}

    jobs_posted = await db.jobs.count_documents(job_q)

    # 2. Collect job IDs for applications count
    jobs_cursor = db.jobs.find(job_q, {"id": 1, "_id": 1})
    job_ids = [j.get("id") or str(j.get("_id")) async for j in jobs_cursor]

    app_conditions = []
    if job_ids:
        app_conditions.append({"jobId": {"$in": job_ids}})
    if recruiter_company:
        app_conditions.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})

    app_q = {"$or": app_conditions} if app_conditions else {"_id": "__no_match__"}
    applications_count = await db.applications.count_documents(app_q) if app_conditions else 0

    # 3. Shortlisted candidates count
    shortlisted_count = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "isShortlisted": True,
    })

    # 4. In-flight interview loops
    interviews_from_interactions = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "interviewStage": {"$in": ["Screening", "Technical Screen", "Interview", "Technical Onsite", "Offer Sent", "Offer Accepted"]},
    })
    interviews_from_apps = await db.applications.count_documents({**app_q, "status": "interview"}) if app_conditions else 0
    interviews_count = max(interviews_from_interactions, interviews_from_apps)

    # 5. Hired / offers accepted count
    hired_from_interactions = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "interviewStage": "Offer Accepted",
    })
    hired_from_apps = await db.applications.count_documents({**app_q, "status": {"$in": ["offer", "hired"]}}) if app_conditions else 0
    hired_count = max(hired_from_interactions, hired_from_apps)

    return RecruiterMetrics(
        jobsPosted=jobs_posted,
        applicationsCount=applications_count,
        shortlistedCount=shortlisted_count,
        interviewsCount=interviews_count,
        hiredCount=hired_count,
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


@router.get("/jobs", response_model=List[JobResponse])
async def get_recruiter_jobs(
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all jobs posted by the authenticated recruiter, with dynamic applicant counts."""
    recruiter_id = user["id"]
    job_q = {"$or": [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]}
    if user.get("role") == "admin":
        job_q = {}

    cursor = db.jobs.find(job_q).sort("postedDate", -1)
    jobs = []
    async for j in cursor:
        job_id = j.get("id") or str(j.get("_id"))
        j["id"] = job_id
        # Dynamically compute applicant count from real applications collection
        applicants_count = await db.applications.count_documents({"jobId": job_id})
        j["applicantsCount"] = applicants_count
        jobs.append(j)
    return jobs


@router.get("/jobs/{job_id}/applications", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all seeker applications for a specific job owned by the recruiter."""
    job_repo = JobRepository(db)
    job = await job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job listing with ID '{job_id}' not found.",
        )

    # Ownership check: only owner recruiter or admin can view applicants
    if user.get("role") != "admin":
        owner_id = job.get("recruiterId") or job.get("postedBy")
        if owner_id and owner_id != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only view applicants for jobs that you posted.",
            )

    target_job_id = job.get("id") or job_id
    cursor = db.applications.find({"jobId": target_job_id}).sort("appliedDate", -1)
    applications = []
    async for app in cursor:
        app["id"] = app.get("id") or str(app.get("_id"))
        user_id = app.get("userId")
        if user_id:
            u_doc = await db.users.find_one(_build_mongo_id_query(user_id))
            p_doc = await db.profiles.find_one({"userId": str(user_id)})
            if u_doc:
                app["applicantEmail"] = u_doc.get("email")
            if p_doc:
                app["applicantName"] = p_doc.get("name") or (u_doc.get("name") if u_doc else None)
                app["applicantHeadline"] = p_doc.get("headline") or p_doc.get("bio")
                app["applicantAvatar"] = p_doc.get("avatar")
            elif u_doc:
                app["applicantName"] = u_doc.get("name")
        app["resumeUrl"] = f"/api/recruiter/applications/{app['id']}/resume"
        applications.append(app)
    return applications


@router.get("/applications", response_model=List[ApplicationResponse])
async def get_all_recruiter_applications(
    jobId: Optional[str] = Query(None, description="Optional job ID filter"),
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve all applications across all jobs owned by the authenticated recruiter."""
    recruiter_id = user["id"]
    if user.get("role") == "admin":
        if jobId:
            app_q = {"jobId": jobId}
        else:
            app_q = {}
    else:
        # Fetch recruiter's jobs
        jobs_cursor = db.jobs.find(
            {"$or": [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]},
            {"id": 1, "_id": 1},
        )
        recruiter_job_ids = [j.get("id") or str(j.get("_id")) async for j in jobs_cursor]
        if jobId:
            if jobId not in recruiter_job_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted. You can only view applicants for jobs that you posted.",
                )
            app_q = {"jobId": jobId}
        else:
            if not recruiter_job_ids:
                return []
            app_q = {"jobId": {"$in": recruiter_job_ids}}

    cursor = db.applications.find(app_q).sort("appliedDate", -1)
    applications = []
    async for app in cursor:
        app["id"] = app.get("id") or str(app.get("_id"))
        user_id = app.get("userId")
        if user_id:
            u_doc = await db.users.find_one(_build_mongo_id_query(user_id))
            p_doc = await db.profiles.find_one({"userId": str(user_id)})
            if u_doc:
                app["applicantEmail"] = u_doc.get("email")
            if p_doc:
                app["applicantName"] = p_doc.get("name") or (u_doc.get("name") if u_doc else None)
                app["applicantHeadline"] = p_doc.get("headline") or p_doc.get("bio")
                app["applicantAvatar"] = p_doc.get("avatar")
            elif u_doc:
                app["applicantName"] = u_doc.get("name")
        app["resumeUrl"] = f"/api/recruiter/applications/{app['id']}/resume"
        applications.append(app)
    return applications


@router.patch("/applications/{app_id}/status", response_model=ApplicationResponse)
async def update_recruiter_application_status(
    app_id: str,
    payload: RecruiterApplicationStatusUpdate,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update recruitment stage for a candidate application (Recruiter Only)."""
    app = await db.applications.find_one(_build_mongo_id_query(app_id))
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    job_id = app.get("jobId")
    if not job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not linked to a job listing.",
        )

    job_repo = JobRepository(db)
    job = await job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job listing associated with this application not found.",
        )

    # Ownership check: recruiter must own the job for this application
    if user.get("role") != "admin":
        owner_id = job.get("recruiterId") or job.get("postedBy")
        if owner_id and owner_id != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only update status for applications to your own jobs.",
            )

    normalized_status = normalize_status(payload.status)
    update_data: Dict[str, Any] = {
        "status": normalized_status,
        "updatedAt": utc_now_iso(),
    }
    if payload.notes:
        update_data["notes"] = payload.notes

    await db.applications.update_one(
        {"_id": app["_id"]},
        {"$set": update_data},
    )

    updated_app = await db.applications.find_one({"_id": app["_id"]})
    updated_app["id"] = updated_app.get("id") or str(updated_app.get("_id"))
    user_id = updated_app.get("userId")
    if user_id:
        u_doc = await db.users.find_one(_build_mongo_id_query(user_id))
        p_doc = await db.profiles.find_one({"userId": str(user_id)})
        if u_doc:
            updated_app["applicantEmail"] = u_doc.get("email")
        if p_doc:
            updated_app["applicantName"] = p_doc.get("name") or (u_doc.get("name") if u_doc else None)
            updated_app["applicantHeadline"] = p_doc.get("headline") or p_doc.get("bio")
            updated_app["applicantAvatar"] = p_doc.get("avatar")
        elif u_doc:
            updated_app["applicantName"] = u_doc.get("name")
    updated_app["resumeUrl"] = f"/api/recruiter/applications/{updated_app['id']}/resume"
    return updated_app


@router.get("/applications/{app_id}/resume")
async def get_applicant_resume_file(
    app_id: str,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Securely stream an applicant's resume only if applied to a job owned by this recruiter."""
    app = await db.applications.find_one(_build_mongo_id_query(app_id))
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )

    job_id = app.get("jobId")
    if not job_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application has no associated job listing.",
        )

    job_repo = JobRepository(db)
    job = await job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job listing associated with this application not found.",
        )

    # Privacy guard: Candidate resume is only accessible to recruiters who own the job applied to
    if user.get("role") != "admin":
        owner_id = job.get("recruiterId") or job.get("postedBy")
        if owner_id and owner_id != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Candidate resumes are only accessible to recruiters for jobs they applied to.",
            )

    # Find the candidate's resume
    resume_doc = None
    if app.get("resumeId"):
        resume_doc = await db.resumes.find_one(_build_mongo_id_query(app["resumeId"]))
    if not resume_doc and app.get("userId"):
        resume_doc = await db.resumes.find_one({"userId": str(app["userId"]), "isPrimary": True})
    if not resume_doc and app.get("userId"):
        resume_doc = await db.resumes.find_one({"userId": str(app["userId"])})

    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate has not uploaded a resume file.",
        )

    storage_key = resume_doc.get("storageKey")
    if not storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume storage key is missing.",
        )

    storage = get_storage_backend()
    if not await storage.exists(storage_key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file content not found in storage repository.",
        )

    filename = resume_doc.get("filename") or "Resume.pdf"
    content_type = resume_doc.get("mimeType") or "application/pdf"
    return StreamingResponse(
        storage.get_stream(storage_key),
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )
