from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

SearchType = Literal["all", "jobs", "people", "posts", "candidates"]


class JobSearchResultItem(BaseModel):
    id: str
    title: str
    company: str
    location: str
    workType: str = "Remote"
    jobType: str = "Full-time"
    salary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    matchScore: Optional[int] = None


class PersonSearchResultItem(BaseModel):
    id: str
    name: str
    headline: str
    company: str
    location: str
    skills: List[str] = Field(default_factory=list)
    avatarInitials: str = "CX"
    avatarGradient: str = "from-brand-600 to-indigo-800"


class PostSearchResultItem(BaseModel):
    id: str
    type: str
    content: str
    tags: List[str] = Field(default_factory=list)
    authorName: str
    createdAt: str
    likesCount: int = 0
    commentsCount: int = 0


class CandidateSearchResultItem(BaseModel):
    id: str
    name: str
    role: str
    location: str
    experienceLevel: str
    skills: List[str] = Field(default_factory=list)
    atsScore: int = 85
    jobMatch: int = 85
    isShortlisted: bool = False


class SearchCounts(BaseModel):
    jobs: int = 0
    people: int = 0
    posts: int = 0
    candidates: int = 0
    total: int = 0


class SearchResultsContainer(BaseModel):
    jobs: List[JobSearchResultItem] = Field(default_factory=list)
    people: List[PersonSearchResultItem] = Field(default_factory=list)
    posts: List[PostSearchResultItem] = Field(default_factory=list)
    candidates: List[CandidateSearchResultItem] = Field(default_factory=list)


class UnifiedSearchResponse(BaseModel):
    query: str
    type: str = "all"
    counts: SearchCounts
    results: SearchResultsContainer
