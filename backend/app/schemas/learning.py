from typing import List, Optional
from pydantic import BaseModel, Field


class LessonSummary(BaseModel):
    id: str
    title: str
    duration: str = "20 min"
    order: int = 1
    completed: bool = False
    snippet: Optional[str] = None
    description: Optional[str] = None


class CourseSummaryResponse(BaseModel):
    id: str
    title: str
    category: str
    difficulty: str  # Beginner | Intermediate | Advanced
    duration: str
    estimatedHours: float = 3.0
    lessonsCount: int
    skillsCovered: List[str] = Field(default_factory=list)
    description: str
    progress: float = 0.0
    isEnrolled: bool = False
    isRecommended: bool = False
    recommendationReason: Optional[str] = None
    completedLessonsCount: int = 0


class CourseDetailResponse(BaseModel):
    id: str
    title: str
    category: str
    difficulty: str
    duration: str
    estimatedHours: float = 3.0
    lessonsCount: int
    skillsCovered: List[str] = Field(default_factory=list)
    description: str
    progress: float = 0.0
    isEnrolled: bool = False
    isRecommended: bool = False
    recommendationReason: Optional[str] = None
    completedLessons: List[str] = Field(default_factory=list)
    lessons: List[LessonSummary] = Field(default_factory=list)


class ProgressMutationResponse(BaseModel):
    courseId: str
    lessonId: Optional[str] = None
    progressPercent: float
    completedLessons: List[str]
    status: str  # in_progress | completed
    completedAt: Optional[str] = None
    message: str


class MyLearningSummaryResponse(BaseModel):
    coursesEnrolled: int = 0
    coursesCompleted: int = 0
    lessonsCompleted: int = 0
    totalStudyHours: float = 0.0
    streakDays: int = 0
