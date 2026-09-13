from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class AtsBreakdown(BaseModel):
    overallScore: int = Field(default=0, ge=0, le=100)
    keywordsScore: int = Field(default=0, ge=0, le=100)
    impactScore: int = Field(default=0, ge=0, le=100)
    formattingScore: int = Field(default=0, ge=0, le=100)
    completenessScore: int = Field(default=0, ge=0, le=100)


class PillarMetric(BaseModel):
    title: str
    weight: str = "25% weight"
    score: int = Field(default=0, ge=0, le=100)
    status: Literal["optimal", "good", "needs_work"] = "good"
    summary: str = ""


class MissingKeyword(BaseModel):
    name: str
    priority: Literal["High", "Medium", "Low"] = "Medium"
    category: str = "General"


class BulletImprovement(BaseModel):
    id: str
    section: str = "Work Experience"
    original: str
    optimized: str
    rationale: str
    scoreImpact: str = "+3% ATS Match"


class FormattingCheck(BaseModel):
    label: str
    status: str = "Passed"
    detail: str = ""


class ResumeAnalysisResult(BaseModel):
    userId: Optional[str] = None
    resumeId: Optional[str] = None
    atsScore: int = Field(default=0, ge=0, le=100)
    percentile: int = Field(default=85, ge=0, le=100)
    targetProfile: str = Field(default="Software Engineer")
    targetRole: str = Field(default="Software Engineer")
    keywords: List[str] = Field(default_factory=list)
    hardSkills: List[str] = Field(default_factory=list)
    atsBreakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    pillars: List[PillarMetric] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    optimizationAreas: List[str] = Field(default_factory=list)
    missingKeywords: List[MissingKeyword] = Field(default_factory=list)
    extractedSkills: Dict[str, List[str]] = Field(default_factory=dict)
    bulletImprovements: List[BulletImprovement] = Field(default_factory=list)
    experienceRewrites: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    formattingRecommendations: List[str] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    formattingHealth: List[FormattingCheck] = Field(default_factory=list)
    rawResumeText: Optional[str] = None
    jobDescription: Optional[str] = None
    analyzedAt: Optional[str] = None
    modelUsed: Optional[str] = None

    @field_validator("atsScore", mode="before")
    @classmethod
    def clamp_ats_score(cls, v: Any) -> int:
        try:
            val = int(v)
            return max(0, min(100, val))
        except (ValueError, TypeError):
            return 0


class ResumeItemResponse(BaseModel):
    id: str
    name: str
    filename: Optional[str] = None
    format: str = "PDF"
    size: str = "0 KB"
    fileSizeBytes: int = 0
    uploadDate: str = ""
    atsScore: Optional[int] = None
    isActive: bool = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ResumeUploadResponse(BaseModel):
    id: str
    filename: str
    format: str = "PDF"
    size: str
    uploadDate: str = ""
    atsScore: Optional[int] = None
    isActive: bool = True
    fileSizeBytes: int = 0


class ResumeAnalyzeRequest(BaseModel):
    resumeId: Optional[str] = None
    jobDescription: Optional[str] = None


class ResumeActiveToggleResponse(BaseModel):
    success: bool = True
    id: str
    isActive: bool
    message: str


class ResumeDeleteResponse(BaseModel):
    success: bool = True
    id: str
    message: str
