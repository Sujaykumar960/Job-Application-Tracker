from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

WorkType = Literal["Remote", "Hybrid", "On-site"]
JobType = Literal["Full-time", "Internship", "Contract"]
ExperienceLevel = Literal["Intern", "Junior", "Mid", "Senior", "Lead"]


class JobSkillItem(BaseModel):
    name: str
    isMatched: bool = False


class JobBase(BaseModel):
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
    skills: List[JobSkillItem] = Field(default_factory=list)
    requiredSkills: List[str] = Field(default_factory=list)
    description: str
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    jobUrl: Optional[str] = None
    applicantsCount: Optional[int] = 0
    isActive: bool = True
    recruiterId: Optional[str] = None
    postedBy: Optional[str] = None
    companyId: Optional[str] = None
    status: Literal["draft", "published", "closed"] = "published"

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skills(cls, v: Any) -> Any:
        if isinstance(v, list):
            result = []
            for item in v:
                if isinstance(item, str):
                    result.append({"name": item, "isMatched": False})
                elif isinstance(item, dict):
                    result.append(item)
                else:
                    result.append({"name": str(item), "isMatched": False})
            return result
        return v


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    companyName: Optional[str] = None
    companyLogo: Optional[str] = None
    location: Optional[str] = None
    salaryRange: Optional[str] = None
    salaryMin: Optional[int] = None
    salaryMax: Optional[int] = None
    workType: Optional[str] = None
    jobType: Optional[str] = None
    experienceLevel: Optional[str] = None
    roleCategory: Optional[str] = None
    skills: Optional[List[JobSkillItem]] = None
    requiredSkills: Optional[List[str]] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    jobUrl: Optional[str] = None
    applicantsCount: Optional[int] = None
    isActive: Optional[bool] = None
    companyId: Optional[str] = None
    status: Optional[Literal["draft", "published", "closed"]] = None


class JobResponse(JobBase):
    id: str
    postedDate: Optional[str] = None
    postedAgo: Optional[str] = None
    matchScore: int = 0
    recruiterId: Optional[str] = None
    postedBy: Optional[str] = None
    companyId: Optional[str] = None
    status: str = "published"

    @model_validator(mode="before")
    @classmethod
    def populate_posted_date(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("postedDate"):
                data["postedDate"] = data.get("createdAt") or ""
        return data


# Backward-compatible alias for frontend
JobItem = JobResponse


class JobFilterQuery(BaseModel):
    search: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    experienceLevel: Optional[str] = None
    experience: Optional[str] = None  # alias
    roleCategory: Optional[str] = None
    role: Optional[str] = None  # alias
    workType: Optional[str] = None
    jobType: Optional[str] = None
    skills: Optional[str] = None
    skill: Optional[str] = None  # alias
    minSalary: Optional[int] = None
    maxSalary: Optional[int] = None
    sortBy: Optional[Literal["match", "newest", "salary"]] = "newest"
    limit: int = 50
    skip: int = 0
    page: Optional[int] = None


class JobPartialSkillItem(BaseModel):
    name: str
    note: str


class JobMissingSkillItem(BaseModel):
    name: str
    priority: Literal["High", "Medium", "Low"] = "Medium"
    module: str = "Learning Hub"


class JobRecommendationItem(BaseModel):
    title: str
    desc: str
    action: str = "Launch Module"
    link: str = "/learning"


class JobMatchAnalysis(BaseModel):
    matchScore: int
    overallScore: int
    matchedSkills: List[str] = Field(default_factory=list)
    partialSkills: List[JobPartialSkillItem] = Field(default_factory=list)
    missingSkills: List[Any] = Field(default_factory=list)
    recommendations: List[Any] = Field(default_factory=list)
    jobId: Optional[str] = None
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    resumeId: Optional[str] = None
    resumeName: Optional[str] = None

