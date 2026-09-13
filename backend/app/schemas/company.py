from typing import Any, List, Optional
from pydantic import BaseModel, Field


class CompanyEmployeeSummary(BaseModel):
    id: str
    name: str
    role: str
    avatarInitials: str = "CX"
    avatarGradient: str = "from-cyan-500 to-blue-600"
    isConnected: bool = False


class CompanyPostSummary(BaseModel):
    id: str
    title: str
    date: str
    content: str
    author: str
    authorRole: str
    likesCount: int = 0


class CompanyProfile(BaseModel):
    id: str
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
    followersCount: int = 0
    isFollowing: Optional[bool] = False
    ownerId: Optional[str] = None
    recruiterIds: List[str] = Field(default_factory=list)
    employees: List[CompanyEmployeeSummary] = Field(default_factory=list)
    posts: List[CompanyPostSummary] = Field(default_factory=list)
    jobs: List[Any] = Field(default_factory=list)


class CompanyCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    tagline: Optional[str] = ""
    logoInitials: Optional[str] = "CX"
    logoGradient: Optional[str] = "from-cyan-500 to-blue-600"
    industry: str
    size: Optional[str] = "50-200"
    headquarters: str
    foundedYear: Optional[str] = "2020"
    fundingStage: Optional[str] = "Series A"
    websiteUrl: Optional[str] = "https://example.com"
    about: str
    mission: Optional[str] = ""
    techStack: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    tagline: Optional[str] = None
    logoInitials: Optional[str] = None
    logoGradient: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    headquarters: Optional[str] = None
    foundedYear: Optional[str] = None
    fundingStage: Optional[str] = None
    websiteUrl: Optional[str] = None
    about: Optional[str] = None
    mission: Optional[str] = None
    techStack: Optional[List[str]] = None
    benefits: Optional[List[str]] = None


class CompanyFollowResponse(BaseModel):
    isFollowing: bool
    followersCount: int
