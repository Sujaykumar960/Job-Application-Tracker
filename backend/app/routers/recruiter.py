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
from app.utils.tenancy import resolve_recruiter_company as _resolve_recruiter_membership

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


def _build_mongo_id_query(id_val: Any) -> Dict[str, Any]:
    if not id_val:
        return {"id": "__empty__"}
    s_id = str(id_val)
    if ObjectId.is_valid(s_id):
        return {"$or": [{"_id": ObjectId(s_id)}, {"id": s_id}]}
    return {"id": s_id}


async def _resolve_recruiter_company(user: Dict[str, Any], db: AsyncIOMotorDatabase) -> Optional[str]:
    # Scoping is derived from immutable membership (users.company /
    # companies.recruiterIds) only. The self-editable profiles.company is
    # deliberately ignored so a recruiter cannot re-scope themselves into a
    # foreign tenant by editing their own profile.
    return await _resolve_recruiter_membership(db, user)


def _can_recruiter_access_job(job: Dict[str, Any], user: Dict[str, Any], recruiter_company: Optional[str]) -> bool:
    if user.get("role") == "admin":
        return True
    user_id = str(user.get("id") or user.get("_id") or "")
    owner_id = str(job.get("recruiterId") or job.get("postedBy") or "")
    if owner_id and owner_id == user_id:
        return True
    if recruiter_company and job.get("company"):
        if job["company"].strip().lower() == recruiter_company.strip().lower():
            return True
    return False


@router.get("/metrics", response_model=RecruiterMetrics)
async def get_recruiter_metrics(
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch recruiter top dashboard performance metrics (Recruiter Only)."""
    recruiter_id = user["id"]
    recruiter_company = await _resolve_recruiter_company(user, db)

    # 1. Jobs posted query
    if user.get("role") == "admin":
        job_q = {}
    else:
        job_filters = [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]
        if recruiter_company:
            job_filters.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})
        job_q = {"$or": job_filters}

    jobs_posted = await db.jobs.count_documents(job_q)

    # 2. Collect job IDs for applications count
    jobs_cursor = db.jobs.find(job_q, {"id": 1, "_id": 1})
    recruiter_job_ids = set()
    async for j in jobs_cursor:
        if j.get("id"):
            recruiter_job_ids.add(str(j["id"]))
        if j.get("_id"):
            recruiter_job_ids.add(str(j["_id"]))

    if user.get("role") == "admin":
        app_q = {}
        has_scope = True
    else:
        app_conditions = []
        if recruiter_job_ids:
            app_conditions.append({"jobId": {"$in": list(recruiter_job_ids)}})
        if recruiter_company:
            app_conditions.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})
        app_q = {"$or": app_conditions} if app_conditions else {"_id": "__no_match__"}
        has_scope = bool(app_conditions)

    applications_count = await db.applications.count_documents(app_q) if has_scope else 0

    # 3. Shortlisted candidates count
    shortlisted_from_interactions = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "isShortlisted": True,
    })
    shortlist_filter = dict(app_q) if app_q else {}
    if shortlist_filter.get("_id") != "__no_match__":
        shortlist_filter["status"] = {"$regex": "^shortlist", "$options": "i"}
        shortlisted_from_apps = await db.applications.count_documents(shortlist_filter) if has_scope else 0
    else:
        shortlisted_from_apps = 0
    shortlisted_count = max(shortlisted_from_interactions, shortlisted_from_apps)

    # 4. In-flight interview loops
    interviews_from_interactions = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "interviewStage": {"$in": ["Screening", "Technical Screen", "Interview", "Technical Onsite", "Offer Sent", "Offer Accepted"]},
    })
    interview_filter = dict(app_q) if app_q else {}
    if interview_filter.get("_id") != "__no_match__":
        interview_filter["status"] = {"$regex": "^(interview|screening|tech)", "$options": "i"}
        interviews_from_apps = await db.applications.count_documents(interview_filter) if has_scope else 0
    else:
        interviews_from_apps = 0
    interviews_count = max(interviews_from_interactions, interviews_from_apps)

    # 5. Hired / offers accepted count
    hired_from_interactions = await db.recruiter_interactions.count_documents({
        "recruiterId": recruiter_id,
        "interviewStage": "Offer Accepted",
    })
    hired_filter = dict(app_q) if app_q else {}
    if hired_filter.get("_id") != "__no_match__":
        hired_filter["status"] = {"$regex": "^(offer|hired|accepted)", "$options": "i"}
        hired_from_apps = await db.applications.count_documents(hired_filter) if has_scope else 0
    else:
        hired_from_apps = 0
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
    recruiter_company = await _resolve_recruiter_company(user, db)

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
    recruiter_company = await _resolve_recruiter_company(user, db)

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
    recruiter_company = await _resolve_recruiter_company(user, db)

    if user.get("role") == "admin":
        job_q = {}
    else:
        job_filters = [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]
        if recruiter_company:
            job_filters.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})
        job_q = {"$or": job_filters}

    cursor = db.jobs.find(job_q).sort("postedDate", -1)
    jobs = []
    async for j in cursor:
        job_id = j.get("id") or str(j.get("_id"))
        j["id"] = job_id
        # Dynamically compute applicant count from real applications collection
        match_ids = [job_id]
        if j.get("_id") and str(j["_id"]) != job_id:
            match_ids.append(str(j["_id"]))
        applicants_count = await db.applications.count_documents({"jobId": {"$in": match_ids}})
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

    # Ownership check: only owner recruiter, company recruiter, or admin can view applicants
    recruiter_company = await _resolve_recruiter_company(user, db)
    if not _can_recruiter_access_job(job, user, recruiter_company):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. You can only view applicants for jobs that you posted.",
        )

    target_job_id = job.get("id") or job_id
    match_ids = [target_job_id]
    if job.get("_id") and str(job["_id"]) != target_job_id:
        match_ids.append(str(job["_id"]))

    cursor = db.applications.find({"jobId": {"$in": match_ids}}).sort("appliedDate", -1)
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
    recruiter_company = await _resolve_recruiter_company(user, db)

    if user.get("role") == "admin":
        if jobId:
            target_job = await db.jobs.find_one(_build_mongo_id_query(jobId))
            match_ids = [jobId]
            if target_job:
                if target_job.get("id"):
                    match_ids.append(str(target_job["id"]))
                if target_job.get("_id"):
                    match_ids.append(str(target_job["_id"]))
            app_q = {"jobId": {"$in": list(set(match_ids))}}
        else:
            app_q = {}
    else:
        # Fetch recruiter's jobs
        job_filters = [{"postedBy": recruiter_id}, {"recruiterId": recruiter_id}]
        if recruiter_company:
            job_filters.append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})
        jobs_cursor = db.jobs.find(
            {"$or": job_filters},
            {"id": 1, "_id": 1, "company": 1},
        )
        recruiter_jobs = [j async for j in jobs_cursor]
        recruiter_job_ids = set()
        for j in recruiter_jobs:
            if j.get("id"):
                recruiter_job_ids.add(str(j["id"]))
            if j.get("_id"):
                recruiter_job_ids.add(str(j["_id"]))

        if jobId:
            target_job = await db.jobs.find_one(_build_mongo_id_query(jobId))
            if not target_job or not _can_recruiter_access_job(target_job, user, recruiter_company):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted. You can only view applicants for jobs that you posted.",
                )
            match_ids = [jobId]
            if target_job.get("id"):
                match_ids.append(str(target_job["id"]))
            if target_job.get("_id"):
                match_ids.append(str(target_job["_id"]))
            app_q = {"jobId": {"$in": list(set(match_ids))}}
        else:
            if not recruiter_job_ids:
                if recruiter_company:
                    app_q = {"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}}
                else:
                    app_q = {"_id": "__no_match__"}
            else:
                app_q = {"$or": [{"jobId": {"$in": list(recruiter_job_ids)}}]}
                if recruiter_company:
                    app_q["$or"].append({"company": {"$regex": f"^{re.escape(recruiter_company)}$", "$options": "i"}})

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

    # Ownership check: recruiter must own the job or belong to company for this application
    recruiter_company = await _resolve_recruiter_company(user, db)
    if not _can_recruiter_access_job(job, user, recruiter_company):
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
    recruiter_company = await _resolve_recruiter_company(user, db)
    if not _can_recruiter_access_job(job, user, recruiter_company):
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
