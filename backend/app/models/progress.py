from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.progress import ActivityDataPoint
from app.utils.helpers import utc_now_iso


class ProgressModel(BaseModel):
    id: Optional[str] = None
    userId: str
    questionsSolved: int = 0
    totalQuestions: int = 150
    accuracyPercentage: float = 0.0
    codingStreakDays: int = 0
    currentAtsScore: int = 75
    projectsCompleted: int = 0
    certificationsCount: int = 0
    activityHistory: List[ActivityDataPoint] = Field(default_factory=list)
    lastPracticedAt: Optional[str] = None
    updatedAt: str = Field(default_factory=utc_now_iso)
