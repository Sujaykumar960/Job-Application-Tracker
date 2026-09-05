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
    """Fetch aggregate career learning and progress statistics."""
    repo = BaseRepository(db, "progress")
    if user:
        doc = await repo.find_one({"userId": user["id"]})
        if doc:
            return ProgressOverview(**doc)
    return ProgressOverview()


@router.get("/activity", response_model=List[ActivityDataPoint])
async def get_activity_history(
    range: str = Query("daily"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch activity history breakdown (daily, weekly, monthly)."""
    return [
        ActivityDataPoint(period="Mon", studyHours=3.5, questionsSolved=6, streakDays=10),
        ActivityDataPoint(period="Tue", studyHours=4.0, questionsSolved=8, streakDays=11),
        ActivityDataPoint(period="Wed", studyHours=2.5, questionsSolved=4, streakDays=12),
        ActivityDataPoint(period="Thu", studyHours=5.0, questionsSolved=10, streakDays=13),
        ActivityDataPoint(period="Fri", studyHours=4.5, questionsSolved=9, streakDays=14),
        ActivityDataPoint(period="Sat", studyHours=6.0, questionsSolved=12, streakDays=15),
        ActivityDataPoint(period="Sun", studyHours=3.0, questionsSolved=5, streakDays=16),
    ]


@router.get("/skills", response_model=List[SkillTrajectory])
async def get_skill_trajectories(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch 6-month skill trajectory growth metrics."""
    return [
        SkillTrajectory(name="Go Concurrency & Channels", initialScore=40, currentScore=92, growthPercentage=130),
        SkillTrajectory(name="Distributed Systems & Consensus", initialScore=30, currentScore=88, growthPercentage=193),
        SkillTrajectory(name="Database Indexing & PostgreSQL", initialScore=55, currentScore=90, growthPercentage=63),
        SkillTrajectory(name="Data Structures & Algorithms", initialScore=60, currentScore=92, growthPercentage=53),
    ]
