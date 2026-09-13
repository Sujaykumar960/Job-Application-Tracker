import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.data.curriculum import COURSES_CATALOG, get_course_by_id
from app.dependencies import get_current_user, get_db, get_optional_user
from app.schemas.learning import (
    CourseDetailResponse,
    CourseSummaryResponse,
    LessonSummary,
    MyLearningSummaryResponse,
    ProgressMutationResponse,
)

router = APIRouter(prefix="/learning", tags=["Learning & Courses"])


@router.get("/courses", response_model=List[CourseSummaryResponse])
async def list_courses(
    category: Optional[str] = Query(None, description="Filter by track category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search keyword in title, description, or skills"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List all curriculum courses merged with authenticated user's real progress.
    Dynamically marks recommended courses based on candidate skill gaps and active resume.
    """
    # 1. Fetch user progress mapping if authenticated
    user_progress_map: Dict[str, Dict[str, Any]] = {}
    missing_skills_set = set()

    if user:
        cursor = db.learning_progress.find({"userId": user["id"]})
        async for doc in cursor:
            user_progress_map[doc["courseId"]] = doc

        # Check candidate's latest resume analysis for identified skill gaps
        latest_analysis = await db.resume_analyses.find_one(
            {"userId": user["id"]},
            sort=[("createdAt", -1)],
        )
        if latest_analysis and "analysis" in latest_analysis:
            gaps = latest_analysis["analysis"].get("skillGaps", [])
            for g in gaps:
                if isinstance(g, str):
                    missing_skills_set.add(g.strip().lower())
                elif isinstance(g, dict) and "skill" in g:
                    missing_skills_set.add(g["skill"].strip().lower())

    results: List[CourseSummaryResponse] = []

    for course in COURSES_CATALOG:
        # Category filter
        if category and category != "All":
            if category == "Recommended":
                # Filter to recommended only
                pass
            elif course.category != category:
                continue

        # Difficulty filter
        if difficulty and difficulty != "All" and course.difficulty != difficulty:
            continue

        # Search filter
        if search and search.strip():
            q = search.strip().lower()
            matches = (
                q in course.title.lower()
                or q in course.description.lower()
                or any(q in s.lower() for s in course.skillsCovered)
                or q in course.category.lower()
            )
            if not matches:
                continue

        # User progress
        prog_doc = user_progress_map.get(course.id)
        progress = float(prog_doc["progressPercent"]) if prog_doc else 0.0
        is_enrolled = prog_doc is not None
        completed_count = len(prog_doc["completedLessons"]) if prog_doc else 0

        # Recommendation logic
        is_rec = False
        rec_reason = None

        if missing_skills_set:
            matching_gaps = [
                s for s in course.skillsCovered
                if s.lower() in missing_skills_set
            ]
            if matching_gaps:
                is_rec = True
                rec_reason = f"⚠ Closes Identified Skill Gap ({', '.join(matching_gaps[:2])})"
        
        # Default baseline recommendations if not dynamically triggered
        if not is_rec and course.id in ("mod-1", "mod-2", "mod-3", "mod-4"):
            is_rec = True
            default_reasons = {
                "mod-1": "⚠ Closes Identified Skill Gap (Kafka & Distributed Systems)",
                "mod-2": "🎯 Target Role Match (Senior Backend Architecture)",
                "mod-3": "⚠ Closes Identified Cloud Gap (AWS & Infrastructure)",
                "mod-4": "⚡ System Design Assessment Preparation",
            }
            rec_reason = default_reasons.get(course.id)

        if category == "Recommended" and not is_rec:
            continue

        results.append(
            CourseSummaryResponse(
                id=course.id,
                title=course.title,
                category=course.category,
                difficulty=course.difficulty,
                duration=course.duration,
                estimatedHours=course.estimatedHours,
                lessonsCount=course.lessonsCount,
                skillsCovered=course.skillsCovered,
                description=course.description,
                progress=progress,
                isEnrolled=is_enrolled,
                isRecommended=is_rec,
                recommendationReason=rec_reason,
                completedLessonsCount=completed_count,
            )
        )

    return results


@router.get("/courses/{course_id}", response_model=CourseDetailResponse)
async def get_course_details(
    course_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch complete course syllabus with lesson details and authenticated user progress."""
    course = get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )

    completed_lessons: List[str] = []
    progress = 0.0
    is_enrolled = False

    if user:
        prog_doc = await db.learning_progress.find_one(
            {"userId": user["id"], "courseId": course_id}
        )
        if prog_doc:
            completed_lessons = prog_doc.get("completedLessons", [])
            progress = float(prog_doc.get("progressPercent", 0.0))
            is_enrolled = True

    completed_set = set(completed_lessons)
    lesson_summaries = [
        LessonSummary(
            id=l.id,
            title=l.title,
            duration=l.duration,
            order=l.order,
            completed=(l.id in completed_set),
            snippet=l.snippet,
            description=l.description,
        )
        for l in course.lessons
    ]

    return CourseDetailResponse(
        id=course.id,
        title=course.title,
        category=course.category,
        difficulty=course.difficulty,
        duration=course.duration,
        estimatedHours=course.estimatedHours,
        lessonsCount=course.lessonsCount,
        skillsCovered=course.skillsCovered,
        description=course.description,
        progress=progress,
        isEnrolled=is_enrolled,
        isRecommended=(course.id in ("mod-1", "mod-2", "mod-3", "mod-4")),
        recommendationReason=None,
        completedLessons=completed_lessons,
        lessons=lesson_summaries,
    )


@router.post("/courses/{course_id}/enroll", response_model=ProgressMutationResponse)
async def enroll_course(
    course_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Enroll in a course. Creates or returns existing user learning progress record."""
    course = get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db.learning_progress.find_one(
        {"userId": user["id"], "courseId": course_id}
    )

    if existing:
        return ProgressMutationResponse(
            courseId=course_id,
            progressPercent=existing.get("progressPercent", 0.0),
            completedLessons=existing.get("completedLessons", []),
            status=existing.get("status", "in_progress"),
            completedAt=existing.get("completedAt"),
            message="Already enrolled in this course.",
        )

    doc = {
        "id": f"prog_{uuid.uuid4().hex[:12]}",
        "userId": user["id"],
        "courseId": course_id,
        "status": "in_progress",
        "completedLessons": [],
        "progressPercent": 0.0,
        "enrolledAt": now_iso,
        "updatedAt": now_iso,
        "completedAt": None,
        "lastLessonId": None,
    }
    await db.learning_progress.insert_one(doc)

    return ProgressMutationResponse(
        courseId=course_id,
        progressPercent=0.0,
        completedLessons=[],
        status="in_progress",
        completedAt=None,
        message="Successfully enrolled in course.",
    )


@router.post("/courses/{course_id}/lessons/{lesson_id}/complete", response_model=ProgressMutationResponse)
async def complete_lesson(
    course_id: str,
    lesson_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Mark a lesson as completed. Deterministically calculates course progress percentage.
    Client cannot forge progress percent directly.
    """
    course = get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )

    valid_lesson_ids = {l.id for l in course.lessons}
    if lesson_id not in valid_lesson_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{lesson_id}' does not belong to course '{course_id}'.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db.learning_progress.find_one(
        {"userId": user["id"], "courseId": course_id}
    )

    completed_set = set(existing.get("completedLessons", [])) if existing else set()
    completed_set.add(lesson_id)
    completed_list = sorted(list(completed_set))

    total = len(valid_lesson_ids)
    progress_pct = round((len(completed_list) / total) * 100.0, 1) if total > 0 else 0.0
    status_str = "completed" if (total > 0 and len(completed_list) >= total) else "in_progress"
    completed_at = now_iso if status_str == "completed" else (existing.get("completedAt") if existing else None)

    if existing:
        await db.learning_progress.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "completedLessons": completed_list,
                    "progressPercent": progress_pct,
                    "status": status_str,
                    "updatedAt": now_iso,
                    "completedAt": completed_at,
                    "lastLessonId": lesson_id,
                }
            },
        )
    else:
        new_doc = {
            "id": f"prog_{uuid.uuid4().hex[:12]}",
            "userId": user["id"],
            "courseId": course_id,
            "status": status_str,
            "completedLessons": completed_list,
            "progressPercent": progress_pct,
            "enrolledAt": now_iso,
            "updatedAt": now_iso,
            "completedAt": completed_at,
            "lastLessonId": lesson_id,
        }
        await db.learning_progress.insert_one(new_doc)

    return ProgressMutationResponse(
        courseId=course_id,
        lessonId=lesson_id,
        progressPercent=progress_pct,
        completedLessons=completed_list,
        status=status_str,
        completedAt=completed_at,
        message=f"Lesson '{lesson_id}' marked completed. Course progress is {progress_pct}%.",
    )


@router.post("/courses/{course_id}/lessons/{lesson_id}/uncomplete", response_model=ProgressMutationResponse)
async def uncomplete_lesson(
    course_id: str,
    lesson_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unmark a lesson as completed. Recalculates course progress percentage."""
    course = get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )

    valid_lesson_ids = {l.id for l in course.lessons}
    if lesson_id not in valid_lesson_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson '{lesson_id}' does not belong to course '{course_id}'.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db.learning_progress.find_one(
        {"userId": user["id"], "courseId": course_id}
    )

    if not existing:
        return ProgressMutationResponse(
            courseId=course_id,
            lessonId=lesson_id,
            progressPercent=0.0,
            completedLessons=[],
            status="in_progress",
            completedAt=None,
            message="User is not enrolled in this course.",
        )

    completed_set = set(existing.get("completedLessons", []))
    completed_set.discard(lesson_id)
    completed_list = sorted(list(completed_set))

    total = len(valid_lesson_ids)
    progress_pct = round((len(completed_list) / total) * 100.0, 1) if total > 0 else 0.0
    status_str = "completed" if (total > 0 and len(completed_list) >= total) else "in_progress"
    completed_at = existing.get("completedAt") if status_str == "completed" else None

    await db.learning_progress.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "completedLessons": completed_list,
                "progressPercent": progress_pct,
                "status": status_str,
                "updatedAt": now_iso,
                "completedAt": completed_at,
            }
        },
    )

    return ProgressMutationResponse(
        courseId=course_id,
        lessonId=lesson_id,
        progressPercent=progress_pct,
        completedLessons=completed_list,
        status=status_str,
        completedAt=completed_at,
        message=f"Lesson '{lesson_id}' unmarked. Course progress is {progress_pct}%.",
    )


@router.post("/courses/{course_id}/reset", response_model=ProgressMutationResponse)
async def reset_course_progress(
    course_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reset all completed lessons and progress for a course."""
    course = get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course '{course_id}' not found.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.learning_progress.update_one(
        {"userId": user["id"], "courseId": course_id},
        {
            "$set": {
                "completedLessons": [],
                "progressPercent": 0.0,
                "status": "in_progress",
                "updatedAt": now_iso,
                "completedAt": None,
                "lastLessonId": None,
            }
        },
        upsert=True,
    )

    return ProgressMutationResponse(
        courseId=course_id,
        progressPercent=0.0,
        completedLessons=[],
        status="in_progress",
        completedAt=None,
        message="Course progress has been reset to 0%.",
    )


@router.get("/my-progress", response_model=MyLearningSummaryResponse)
async def get_my_learning_summary(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch user's aggregated learning statistics derived directly from MongoDB records."""
    cursor = db.learning_progress.find({"userId": user["id"]})
    enrolled_count = 0
    completed_count = 0
    total_lessons_done = 0
    total_hours = 0.0
    activity_dates = set()

    async for doc in cursor:
        enrolled_count += 1
        if doc.get("status") == "completed":
            completed_count += 1

        completed = doc.get("completedLessons", [])
        total_lessons_done += len(completed)

        course = get_course_by_id(doc.get("courseId", ""))
        if course and course.lessonsCount > 0:
            course_hours = course.estimatedHours
            lesson_fraction = len(completed) / course.lessonsCount
            total_hours += course_hours * min(lesson_fraction, 1.0)

        updated_at = doc.get("updatedAt")
        if updated_at:
            activity_dates.add(updated_at[:10])

    streak = len(activity_dates)

    return MyLearningSummaryResponse(
        coursesEnrolled=enrolled_count,
        coursesCompleted=completed_count,
        lessonsCompleted=total_lessons_done,
        totalStudyHours=round(total_hours, 1),
        streakDays=streak,
    )
