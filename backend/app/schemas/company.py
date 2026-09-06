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
    foundedYear: Optional[str] = "2020"
    founded: Optional[str] = "2020"
    fundingStage: Optional[str] = "Growth"
    funding: Optional[str] = "Growth"
    websiteUrl: Optional[str] = "https://example.com"
    website: Optional[str] = "https://example.com"
    about: str
    mission: str
    techStack: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    openJobsCount: int = 0
    followersCount: int = 0
    isFollowing: Optional[bool] = False
    isAiGenerated: Optional[bool] = False
    employees: List[CompanyEmployeeSummary] = Field(default_factory=list)
    posts: List[CompanyPostSummary] = Field(default_factory=list)
    jobs: List[Any] = Field(default_factory=list)


class CompanyFollowResponse(BaseModel):
    isFollowing: bool
    followersCount: int


class CompanyDiscoverRequest(BaseModel):
    industry: Optional[str] = None
    query: Optional[str] = None
    companyName: Optional[str] = None
    count: Optional[int] = 3

