from typing import List, Optional
from pydantic import BaseModel, Field


class Lesson(BaseModel):
    id: str
    title: str
    duration: str = "20 min"
    order: int = 1
    snippet: Optional[str] = None
    description: Optional[str] = None


class Course(BaseModel):
    id: str
    title: str
    category: str
    difficulty: str  # Beginner | Intermediate | Advanced
    duration: str
    estimatedHours: float = 3.0
    lessonsCount: int
    skillsCovered: List[str] = Field(default_factory=list)
    description: str
    lessons: List[Lesson] = Field(default_factory=list)


class UserCourseProgress(BaseModel):
    id: str
    userId: str
    courseId: str
    status: str = "in_progress"  # "in_progress" | "completed"
    completedLessons: List[str] = Field(default_factory=list)
    progressPercent: float = 0.0
    enrolledAt: str
    updatedAt: str
    completedAt: Optional[str] = None
    lastLessonId: Optional[str] = None
