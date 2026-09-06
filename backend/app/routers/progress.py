from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.repositories.base import BaseRepository
from app.schemas.progress import ActivityDataPoint, ProgressOverview, SkillTrajectory

router = APIRouter(prefix="/progress", tags=["Career Progress"])


@router.get("/overview", response_model=ProgressOverview)
async def get_progress_overview(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch aggregate career learning and progress statistics from MongoDB."""
    if not user:
        return ProgressOverview()

    user_id = user["id"]
    repo = BaseRepository(db, "progress")
    doc = await repo.find_one({"userId": user_id})

    # Real questions solved
    solved_count = await db.submissions.count_documents({"userId": user_id, "status": "Accepted"})
    total_questions = await db.questions.count_documents({})
    total_submissions = await db.submissions.count_documents({"userId": user_id})
    accuracy = round((solved_count / total_submissions * 100), 1) if total_submissions > 0 else 0.0

    # User's atsScore
    user_doc = await db.users.find_one({"id": user_id}) or {}
    prof = await db.profiles.find_one({"userId": user_id}) or {}
    ats_score = prof.get("atsScore") or user_doc.get("atsScore") or 0

    if doc:
        return ProgressOverview(
            questionsSolved=doc.get("questionsSolved", solved_count),
            totalQuestions=doc.get("totalQuestions", total_questions),
            accuracy=doc.get("accuracy", accuracy),
            codingStreakDays=doc.get("codingStreakDays", 0),
            currentAtsScore=doc.get("currentAtsScore", ats_score),
            projectsCompleted=doc.get("projectsCompleted", 0),
            certificationsCount=doc.get("certificationsCount", 0),
        )

    return ProgressOverview(
        questionsSolved=solved_count,
        totalQuestions=total_questions,
        accuracy=accuracy,
        codingStreakDays=0,
        currentAtsScore=ats_score,
        projectsCompleted=0,
        certificationsCount=0,
    )


@router.get("/activity", response_model=List[ActivityDataPoint])
async def get_activity_history(
    range: str = Query("daily"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch real persisted activity history breakdown. Returns empty list if no activity exists."""
    if not user:
        return []

    user_id = user["id"]
    repo = BaseRepository(db, "progress")
    doc = await repo.find_one({"userId": user_id})

    if doc and "activity" in doc and isinstance(doc["activity"], list):
        return [ActivityDataPoint(**a) for a in doc["activity"]]

    return []


@router.get("/skills", response_model=List[SkillTrajectory])
async def get_skill_trajectories(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch real user skill trajectory growth metrics. Returns empty list if no data exists."""
    if not user:
        return []

    user_id = user["id"]
    repo = BaseRepository(db, "progress")
    doc = await repo.find_one({"userId": user_id})

    if doc and "skills" in doc and isinstance(doc["skills"], list):
        return [SkillTrajectory(**s) for s in doc["skills"]]

    return []
