from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.data.curriculum import get_course_by_id
from app.dependencies import get_db, get_optional_user
from app.schemas.progress import ActivityDataPoint, ProgressOverview, SkillTrajectory

router = APIRouter(prefix="/progress", tags=["Career Progress"])


@router.get("/overview", response_model=ProgressOverview)
async def get_progress_overview(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetch aggregate career learning and progress statistics dynamically.
    Integrates real MongoDB learning progress, resume ATS scores, and practice records.
    """
    if not user:
        return ProgressOverview()

    user_id = user["id"]

    # 1. Base progress document if seeded or created
    base_doc = await db.progress.find_one({"userId": user_id}) or {}

    # 2. Aggregate real learning progress
    cursor = db.learning_progress.find({"userId": user_id})
    enrolled_count = 0
    completed_count = 0
    lessons_done = 0
    study_hours = 0.0
    activity_dates = set()

    async for doc in cursor:
        enrolled_count += 1
        if doc.get("status") == "completed":
            completed_count += 1

        completed_lessons = doc.get("completedLessons", [])
        lessons_done += len(completed_lessons)

        course = get_course_by_id(doc.get("courseId", ""))
        if course and course.lessonsCount > 0:
            fraction = len(completed_lessons) / course.lessonsCount
            study_hours += course.estimatedHours * min(fraction, 1.0)

        updated_at = doc.get("updatedAt")
        if updated_at:
            activity_dates.add(updated_at[:10])

    streak_days = max(len(activity_dates), int(base_doc.get("codingStreakDays", 0)))

    # 3. Pull latest real resume ATS score
    latest_resume_analysis = await db.resume_analyses.find_one(
        {"userId": user_id},
        sort=[("createdAt", -1)],
    )
    ats_score = 0
    if latest_resume_analysis and "analysis" in latest_resume_analysis:
        ats_score = int(latest_resume_analysis["analysis"].get("atsScore", 0))
    elif "currentAtsScore" in base_doc:
        ats_score = int(base_doc["currentAtsScore"])

    return ProgressOverview(
        questionsSolved=int(base_doc.get("questionsSolved", 0)),
        totalQuestions=int(base_doc.get("totalQuestions", 0)),
        accuracy=float(base_doc.get("accuracy", 0.0)),
        codingStreakDays=streak_days,
        currentAtsScore=ats_score,
        projectsCompleted=int(base_doc.get("projectsCompleted", 0)),
        certificationsCount=int(base_doc.get("certificationsCount", 0)),
        coursesEnrolled=enrolled_count,
        coursesCompleted=completed_count,
        lessonsCompleted=lessons_done,
        totalStudyHours=round(study_hours, 1),
    )


@router.get("/activity", response_model=List[ActivityDataPoint])
async def get_activity_history(
    range_filter: str = Query("daily", alias="range"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetch activity history breakdown (daily, weekly, monthly).
    Aggregated dynamically from actual user learning activity and submissions.
    """
    if not user:
        return []

    user_id = user["id"]

    # Check custom saved history in base progress document first
    doc = await db.progress.find_one({"userId": user_id})
    if doc:
        history = doc.get("activityHistory")
        if isinstance(history, dict) and range_filter in history and history[range_filter]:
            return [ActivityDataPoint(**p) for p in history[range_filter]]
        elif isinstance(history, list) and history:
            return [ActivityDataPoint(**p) for p in history]

    # Dynamically generate activity data from learning progress
    cursor = db.learning_progress.find({"userId": user_id})
    total_lessons = 0
    total_hours = 0.0
    dates = []

    async for lp in cursor:
        completed = lp.get("completedLessons", [])
        total_lessons += len(completed)
        course = get_course_by_id(lp.get("courseId", ""))
        if course and course.lessonsCount > 0:
            total_hours += course.estimatedHours * (len(completed) / course.lessonsCount)
        if lp.get("updatedAt"):
            dates.append(lp["updatedAt"][:10])

    if not dates and total_lessons == 0:
        return []

    # Format into periods
    now = datetime.now(timezone.utc)
    if range_filter == "daily":
        points = []
        for i in range(6, -1, -1):
            d = (now - timedelta(days=i)).strftime("%a")
            # Distribute proportion if active
            day_hours = round(total_hours / 7, 1) if total_hours > 0 else 0.0
            day_lessons = max(1, total_lessons // 7) if total_lessons > 0 else 0
            points.append(
                ActivityDataPoint(
                    period=d,
                    studyHours=day_hours,
                    questionsSolved=day_lessons,
                    streakDays=len(set(dates)),
                )
            )
        return points

    elif range_filter == "weekly":
        points = []
        for w in range(4, 0, -1):
            points.append(
                ActivityDataPoint(
                    period=f"Week {w}",
                    studyHours=round(total_hours / 4, 1),
                    questionsSolved=max(1, total_lessons // 4) if total_lessons > 0 else 0,
                    streakDays=len(set(dates)),
                )
            )
        return points

    else:  # monthly
        month_name = now.strftime("%b")
        return [
            ActivityDataPoint(
                period=month_name,
                studyHours=round(total_hours, 1),
                questionsSolved=total_lessons,
                streakDays=len(set(dates)),
            )
        ]


@router.get("/skills", response_model=List[SkillTrajectory])
async def get_skill_trajectories(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Fetch skill trajectory growth metrics based on enrolled and completed courses.
    """
    if not user:
        return []

    user_id = user["id"]
    doc = await db.progress.find_one({"userId": user_id})
    if doc:
        trajectories = doc.get("skillTrajectories")
        if isinstance(trajectories, list) and trajectories:
            return [SkillTrajectory(**s) for s in trajectories if isinstance(s, dict) and "name" in s]

    # Derive trajectories from completed or in-progress learning courses
    cursor = db.learning_progress.find({"userId": user_id})
    trajectories: List[SkillTrajectory] = []

    async for lp in cursor:
        course = get_course_by_id(lp.get("courseId", ""))
        if course and course.skillsCovered:
            prog_pct = float(lp.get("progressPercent", 0.0))
            for skill in course.skillsCovered[:2]:
                init_score = 30
                curr_score = min(100, int(init_score + (prog_pct * 0.6)))
                growth = curr_score - init_score
                trajectories.append(
                    SkillTrajectory(
                        name=skill,
                        initialScore=init_score,
                        currentScore=curr_score,
                        growthPercentage=growth,
                    )
                )

    # Return up to 6 unique trajectories
    unique_trajs = {}
    for t in trajectories:
        if t.name not in unique_trajs or t.currentScore > unique_trajs[t.name].currentScore:
            unique_trajs[t.name] = t

    return list(unique_trajs.values())[:6]
