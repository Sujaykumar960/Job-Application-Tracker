from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso

ApplicationStatus = Literal["Applied", "Interview", "Offer", "Rejected"]
PriorityLevel = Literal["Low", "Medium", "High"]


class ApplicationModel(BaseModel):
    id: Optional[str] = None
    userId: str
    jobId: Optional[str] = None
    company: str
    role: str
    companyName: Optional[str] = None
    roleTitle: Optional[str] = None
    location: str = "Remote"
    jobUrl: Optional[str] = None
    appliedDate: str = Field(default_factory=utc_now_iso)
    deadline: Optional[str] = None
    deadlineDate: Optional[str] = None
    interviewDate: Optional[str] = None
    recruiter: Optional[str] = None
    status: ApplicationStatus = "Applied"
    priority: PriorityLevel = "Medium"
    notes: Optional[str] = None
    resume: Optional[str] = None
    resumeUrl: Optional[str] = None
    salaryRange: Optional[str] = None
    matchScore: int = 85
    tags: List[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
