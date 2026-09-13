from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.schemas.job import JobMatchAnalysis
from app.schemas.skill_gap import CustomJobMatchRequest, SkillGapAnalysisResponse
from app.services.matching_service import (
    calculate_job_match,
    calculate_skill_gap_matrix,
    extract_skills_from_text,
    get_candidate_skills,
)

router = APIRouter(prefix="/skill-gap", tags=["Skill Gap Analysis"])


@router.get("", response_model=SkillGapAnalysisResponse)
async def get_skill_gap_analysis(
    track: Optional[str] = Query(None, description="Target career track: backend, fullstack, distributed"),
    jobId: Optional[str] = Query(None, description="Optional target job ID"),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve real-time skill gap analysis and competency radar.
    Calculates verified candidate skills from active resume and profile
    against real MongoDB job demand.
    """
    result = await calculate_skill_gap_matrix(
        db=db,
        user_id=user["id"],
        target_track=track,
        job_id=jobId,
    )
    return result


@router.post("/custom", response_model=JobMatchAnalysis)
async def analyze_custom_skill_gap(
    request: CustomJobMatchRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Evaluate candidate competencies against a custom-pasted job description.
    """
    if not request.jobDescription or not request.jobDescription.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text is required.",
        )

    candidate_skills, _, target_resume, _ = await get_candidate_skills(
        db, user["id"], resume_id=request.resumeId
    )

    extracted_skills = extract_skills_from_text(request.jobDescription)
    synthetic_job = {
        "id": "custom-job",
        "title": request.jobTitle or "Custom Target Opportunity",
        "company": request.companyName or "Target Company",
        "skills": [{"name": s} for s in extracted_skills],
        "requiredSkills": list(extracted_skills),
        "description": request.jobDescription,
        "experienceLevel": "Mid",
        "workType": "Remote",
        "location": "Remote",
    }

    match_result = calculate_job_match(
        candidate_skills=candidate_skills,
        job=synthetic_job,
        candidate_exp=user.get("experienceLevel", "Mid"),
        candidate_loc=user.get("location", "Remote"),
        target_resume=target_resume,
    )

    return match_result
