from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.schemas.job import JobSkillItem
from app.utils.helpers import utc_now_iso


class JobModel(BaseModel):
    id: Optional[str] = None
    title: str
    company: str
    companyName: Optional[str] = None
    companyLogo: Optional[str] = None
    location: str
    salaryRange: str = "$120,000 - $160,000"
    salaryMin: Optional[int] = None
    salaryMax: Optional[int] = None
    workType: str = "Remote"
    jobType: str = "Full-time"
    experienceLevel: str = "Mid"
    roleCategory: str = "Software Engineering"
    postedDate: str = Field(default_factory=utc_now_iso)
    matchScore: int = 85
    skills: List[JobSkillItem] = Field(default_factory=list)
    requiredSkills: List[str] = Field(default_factory=list)
    description: str
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    jobUrl: Optional[str] = None
    applicantsCount: int = 0
    isActive: bool = True
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
