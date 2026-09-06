from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

CandidateExperienceLevel = Literal["Entry / Intern", "Junior", "Mid Level", "Senior", "Lead"]
InterviewStageType = Literal["Not Started", "Phone Screen", "Technical Onsite", "Offer Sent"]
ContactVisibilityType = Literal["all_recruiters", "mutual_matches", "hidden"]
SearchStatusType = Literal["actively_looking", "casually_browsing", "not_looking"]


class CandidatePrivacySchema(BaseModel):
    searchStatus: SearchStatusType = "actively_looking"
    showSalary: bool = True
    salaryExpectation: Optional[str] = None
    contactVisibility: ContactVisibilityType = "all_recruiters"
    email: Optional[str] = None
    phone: Optional[str] = None
    cloakedFromCurrentEmployer: bool = False
    currentEmployer: Optional[str] = None


class CandidateCreate(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    location: str
    experienceLevel: str = "Mid Level"
    yearsExperience: str = "3 yrs"
    skills: List[str] = Field(default_factory=list)
    questionsSolved: int = 0
    totalQuestions: int = 150
    accuracy: float = 0.0
    streak: int = 0
    projectsCount: int = 0
    featuredProjects: List[str] = Field(default_factory=list)
    assessmentName: str = "General Engineering Assessment"
    assessmentScore: int = 80
    assessmentPercentile: str = "Top 15%"
    jobMatch: int = 85
    targetRole: str = "Software Engineer"
    careerGrowthMetric: str = "Steady progress"
    atsScore: int = 80
    avatarInitials: str = "CX"
    avatarGradient: str = "from-brand-600 to-indigo-800"
    privacy: CandidatePrivacySchema


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    experienceLevel: Optional[str] = None
    yearsExperience: Optional[str] = None
    skills: Optional[List[str]] = None
    questionsSolved: Optional[int] = None
    totalQuestions: Optional[int] = None
    accuracy: Optional[float] = None
    streak: Optional[int] = None
    projectsCount: Optional[int] = None
    featuredProjects: Optional[List[str]] = None
    assessmentName: Optional[str] = None
    assessmentScore: Optional[int] = None
    assessmentPercentile: Optional[str] = None
    jobMatch: Optional[int] = None
    targetRole: Optional[str] = None
    careerGrowthMetric: Optional[str] = None
    atsScore: Optional[int] = None
    privacy: Optional[CandidatePrivacySchema] = None


class RecruiterCandidate(BaseModel):
    id: str
    name: str
    role: str
    location: str
    experienceLevel: str
    yearsExperience: str
    skills: List[str] = Field(default_factory=list)
    questionsSolved: int
    totalQuestions: int
    accuracy: float
    streak: int
    projectsCount: int
    featuredProjects: List[str] = Field(default_factory=list)
    assessmentName: str
    assessmentScore: int
    assessmentPercentile: str
    jobMatch: int
    targetRole: str
    careerGrowthMetric: str
    atsScore: int
    avatarInitials: str
    avatarGradient: str
    isShortlisted: bool = False
    interviewStage: Optional[str] = "Not Started"
    privacy: CandidatePrivacySchema


CandidateResponse = RecruiterCandidate


class CandidateFilterQuery(BaseModel):
    role: Optional[str] = None
    skills: Optional[str] = None
    experienceLevel: Optional[str] = None
    experience: Optional[str] = None
    location: Optional[str] = None
    minAssessmentScore: Optional[int] = None
    assessmentScore: Optional[int] = None
    minJobMatch: Optional[int] = None
    jobMatch: Optional[int] = None
    atsScore: Optional[int] = None
    searchStatus: Optional[str] = None
    search: Optional[str] = None
    limit: int = 50
    skip: int = 0
    page: Optional[int] = None

    @model_validator(mode="after")
    def normalize_aliases(self) -> "CandidateFilterQuery":
        if not self.experienceLevel and self.experience:
            self.experienceLevel = self.experience
        if not self.minAssessmentScore and self.assessmentScore:
            self.minAssessmentScore = self.assessmentScore
        if not self.minJobMatch and self.jobMatch:
            self.minJobMatch = self.jobMatch
        return self


class CandidateStageUpdatePayload(BaseModel):
    stage: Optional[InterviewStageType] = None
    interviewStage: Optional[InterviewStageType] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def normalize_stage(self) -> "CandidateStageUpdatePayload":
        if not self.stage and self.interviewStage:
            self.stage = self.interviewStage
        elif not self.interviewStage and self.stage:
            self.interviewStage = self.stage
        if not self.stage:
            self.stage = "Not Started"
            self.interviewStage = "Not Started"
        return self


# Backward-compatible alias
CandidateInterviewStageUpdate = CandidateStageUpdatePayload


class ShortlistResponse(BaseModel):
    isShortlisted: bool


class RecruiterMetrics(BaseModel):
    jobsPosted: int = 0
    applicationsCount: int = 0
    shortlistedCount: int = 0
    interviewsCount: int = 0
    hiredCount: int = 0
