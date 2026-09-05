from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.schemas.company import CompanyEmployeeSummary, CompanyPostSummary
from app.utils.helpers import utc_now_iso


class CompanyModel(BaseModel):
    id: Optional[str] = None
    slug: str
    name: str
    tagline: str
    logoInitials: str = "CX"
    logoGradient: str = "from-cyan-500 to-blue-600"
    industry: str
    size: str
    headquarters: str
    foundedYear: str
    fundingStage: str
    websiteUrl: str
    about: str
    mission: str
    techStack: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    openJobsCount: int = 0
    followers: List[str] = Field(default_factory=list)  # userIds
    employees: List[CompanyEmployeeSummary] = Field(default_factory=list)
    posts: List[CompanyPostSummary] = Field(default_factory=list)
    jobs: List[Any] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
