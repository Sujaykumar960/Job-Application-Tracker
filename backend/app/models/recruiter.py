from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso

CandidateExperienceLevel = Literal["Entry / Intern", "Junior", "Mid Level", "Senior", "Lead"]
InterviewStageType = Literal["Not Started", "Phone Screen", "Technical Onsite", "Offer Sent"]
ContactVisibilityType = Literal["all_recruiters", "mutual_matches", "hidden"]
SearchStatusType = Literal["actively_looking", "casually_browsing", "not_looking"]


class CandidatePrivacyModel(BaseModel):
    searchStatus: SearchStatusType = "actively_looking"
    showSalary: bool = True
    salaryExpectation: str = "$150,000 - $180,000"
    contactVisibility: ContactVisibilityType = "all_recruiters"
    email: str
    phone: Optional[str] = None
    cloakedFromCurrentEmployer: bool = False
    currentEmployer: Optional[str] = None


class CandidateModel(BaseModel):
    id: Optional[str] = None
    userId: str
    name: str
    role: str
    location: str
    experienceLevel: CandidateExperienceLevel = "Mid Level"
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
    privacy: CandidatePrivacyModel
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None


class RecruiterInteractionModel(BaseModel):
    """Tracks recruiter-specific candidate shortlists, notes, and interview stages."""
    id: Optional[str] = None
    recruiterId: str
    candidateId: str
    isShortlisted: bool = False
    interviewStage: InterviewStageType = "Not Started"
    notes: Optional[str] = None
    updatedAt: str = Field(default_factory=utc_now_iso)


class RecruiterModel(BaseModel):
    id: Optional[str] = None
    userId: str
    companyId: Optional[str] = None
    companyName: str
    title: str
    department: str = "Technical Recruiting"
    isVerified: bool = True
    activeJobsCount: int = 0
    totalApplicationsReviewed: int = 0
    shortlistedCandidatesCount: int = 0
    activeInterviewLoopsCount: int = 0
    totalHiresCount: int = 0
    shortlistedCandidateIds: List[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
