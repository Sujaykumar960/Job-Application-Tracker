from pydantic import BaseModel


class ProgressOverview(BaseModel):
    questionsSolved: int = 142
    totalQuestions: int = 150
    accuracy: float = 93.4
    codingStreakDays: int = 14
    currentAtsScore: int = 88
    projectsCompleted: int = 4
    certificationsCount: int = 3


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
