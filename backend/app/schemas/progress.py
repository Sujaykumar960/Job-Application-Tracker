from pydantic import BaseModel


class ProgressOverview(BaseModel):
    questionsSolved: int = 0
    totalQuestions: int = 0
    accuracy: float = 0.0
    codingStreakDays: int = 0
    currentAtsScore: int = 0
    projectsCompleted: int = 0
    certificationsCount: int = 0


class ActivityDataPoint(BaseModel):
    period: str
    studyHours: float
    questionsSolved: int
    streakDays: int


class SkillTrajectory(BaseModel):
    name: str
    initialScore: int
    currentScore: int
    growthPercentage: int
