from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class UpcomingInterviewItem(BaseModel):
    id: str
    company: str
    role: str
    date: str
    status: str
    urgency: str = "medium"
    link: str = "/applications"


class UpcomingDeadlineItem(BaseModel):
    id: str
    company: str
    role: str
    deadline: str
    status: str
    urgency: str = "medium"


class ApplicationMetrics(BaseModel):
    total: int = 0
    applied: int = 0
    interviewing: int = 0
    offered: int = 0
    rejected: int = 0
    wishlist: int = 0


class LearningProgressSummary(BaseModel):
    questionsSolved: int = 0
    totalQuestions: int = 150
    accuracy: float = 0.0
    streakDays: int = 0


class UserProfileOverview(BaseModel):
    id: str
    name: str
    headline: str = ""
    atsScore: int = 85
    skills: List[str] = Field(default_factory=list)


class DashboardOverviewResponse(BaseModel):
    profile: UserProfileOverview
    applications: ApplicationMetrics
    upcomingInterviews: List[UpcomingInterviewItem] = Field(default_factory=list)
    upcomingDeadlines: List[UpcomingDeadlineItem] = Field(default_factory=list)
    unreadNotificationsCount: int = 0
    unreadMessagesCount: int = 0
    connectionRequestsCount: int = 0
    savedJobsCount: int = 0
    learningProgress: Optional[LearningProgressSummary] = None


ActivityType = Literal["application", "message", "notification", "connection", "feed"]


class DashboardActivityItem(BaseModel):
    id: str
    type: ActivityType
    title: str
    description: str
    timestamp: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DashboardActivityResponse(BaseModel):
    activities: List[DashboardActivityItem] = Field(default_factory=list)
    totalCount: int = 0
