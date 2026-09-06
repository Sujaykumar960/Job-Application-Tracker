from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

ApplicationStatus = Literal[
    "Applied", "Interview", "Offer", "Rejected", "Wishlist", "Interviewing", "Offered"
]
PriorityLevel = Literal["Low", "Medium", "High"]


def normalize_status(val: Any) -> Any:
    if not isinstance(val, str):
        return val
    s = val.strip().lower()
    if s in ["interview", "interviewing"]:
        return "Interview"
    if s in ["offer", "offered"]:
        return "Offer"
    if s == "applied":
        return "Applied"
    if s == "rejected":
        return "Rejected"
    if s == "wishlist":
        return "Wishlist"
    return val.capitalize()


class ApplicationBase(BaseModel):
    company: str
    role: str
    companyName: Optional[str] = None
    roleTitle: Optional[str] = None
    location: str = "Remote"
    jobUrl: Optional[str] = None
    appliedDate: Optional[str] = None
    deadline: Optional[str] = None
    deadlineDate: Optional[str] = None
    interviewDate: Optional[str] = None
    recruiter: Optional[str] = None
    status: ApplicationStatus = "Applied"
    priority: PriorityLevel = "Medium"
    notes: Optional[str] = None
    resume: Optional[str] = None
    matchScore: int = 85
    salaryRange: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Any:
        return normalize_status(v)


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    companyName: Optional[str] = None
    roleTitle: Optional[str] = None
    location: Optional[str] = None
    jobUrl: Optional[str] = None
    appliedDate: Optional[str] = None
    deadline: Optional[str] = None
    deadlineDate: Optional[str] = None
    interviewDate: Optional[str] = None
    recruiter: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    priority: Optional[PriorityLevel] = None
    notes: Optional[str] = None
    resume: Optional[str] = None
    matchScore: Optional[int] = None
    salaryRange: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Any:
        return normalize_status(v) if v is not None else None


class ApplicationResponse(ApplicationBase):
    id: str
    userId: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ApplicationFilterQuery(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    company: Optional[str] = None
    upcoming: Optional[bool] = None
    search: Optional[str] = None
    limit: int = 50
    skip: int = 0


class ApplicationStatsResponse(BaseModel):
    totalApplications: int = 0
    applied: int = 0
    interviews: int = 0
    offers: int = 0
    rejected: int = 0
    upcomingInterviews: int = 0
    upcomingDeadlines: int = 0
    # Backward-compatible aliases
    total: Optional[int] = None
    interview: Optional[int] = None
    offer: Optional[int] = None

    @model_validator(mode="after")
    def populate_aliases(self) -> "ApplicationStatsResponse":
        if self.total is None:
            self.total = self.totalApplications
        if self.interview is None:
            self.interview = self.interviews
        if self.offer is None:
            self.offer = self.offers
        return self
