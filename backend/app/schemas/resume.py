from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AtsBreakdown(BaseModel):
    overallScore: int = 85
    keywordsScore: int = 88
    impactScore: int = 82
    formattingScore: int = 90
    completenessScore: int = 85


class MissingKeywordItem(BaseModel):
    name: str
    priority: str = "High"  # High, Medium, Low
    category: str = "Technical"


class BulletImprovementItem(BaseModel):
    id: str
    section: str = "Work Experience"
    original: str
    optimized: str
    rationale: str
    scoreImpact: str = "+3% ATS Match"


class PillarMetricItem(BaseModel):
    title: str
    weight: str
    score: int
    status: str = "good"  # optimal, good, warning, critical
    summary: str


class ResumeDocument(BaseModel):
    id: str
    userId: str
    originalFilename: str
    filename: str
    fileId: Optional[str] = None
    fileUrl: Optional[str] = None
    storageKey: str
    contentType: str = "application/pdf"
    fileType: str = "application/pdf"
    fileSizeBytes: int = 0
    fileSize: Optional[str] = None
    extractedText: Optional[str] = None
    parsedText: Optional[str] = None
    isPrimary: bool = True
    isActive: bool = True
    latestAnalysisId: Optional[str] = None
    atsScore: Optional[int] = None
    uploadedAt: str
    createdAt: str
    updatedAt: Optional[str] = None


class ResumeAnalysisDocument(BaseModel):
    id: str
    userId: str
    resumeId: str
    originalFilename: Optional[str] = None
    filename: Optional[str] = None
    atsScore: int = 85
    percentile: int = 85
    targetRole: Optional[str] = "Full Stack / Software Engineer"
    targetProfile: Optional[str] = "Full Stack / Software Engineer"
    status: str = "completed"
    engine: str = "groq/openai/gpt-oss-120b"
    atsBreakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    categoryScores: Optional[AtsBreakdown] = None
    pillars: List[PillarMetricItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    optimizationAreas: List[str] = Field(default_factory=list)
    missingKeywords: List[Any] = Field(default_factory=list)
    keywords: List[Any] = Field(default_factory=list)
    hardSkills: List[str] = Field(default_factory=list)
    extractedSkills: Dict[str, List[str]] = Field(default_factory=dict)
    bulletImprovements: List[BulletImprovementItem] = Field(default_factory=list)
    experienceRewrites: List[BulletImprovementItem] = Field(default_factory=list)
    skillGaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    rawTextSnippet: Optional[str] = None
    isAiGenerated: bool = True
    analyzedAt: str
    createdAt: str


class ResumeAnalysisResult(BaseModel):
    id: Optional[str] = None
    userId: Optional[str] = None
    resumeId: Optional[str] = None
    atsScore: int = 85
    targetRole: Optional[str] = "Full Stack / Software Engineer"
    targetProfile: Optional[str] = "Full Stack / Software Engineer"
    percentile: Optional[int] = 85
    atsBreakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    pillars: List[PillarMetricItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    optimizationAreas: List[str] = Field(default_factory=list)
    missingKeywords: List[Any] = Field(default_factory=list)
    keywords: List[Any] = Field(default_factory=list)
    hardSkills: List[str] = Field(default_factory=list)
    extractedSkills: Dict[str, List[str]] = Field(default_factory=dict)
    bulletImprovements: List[BulletImprovementItem] = Field(default_factory=list)
    experienceRewrites: List[BulletImprovementItem] = Field(default_factory=list)
    projects: List[Any] = Field(default_factory=list)
    education: List[Any] = Field(default_factory=list)
    formattingRecommendations: List[str] = Field(default_factory=list)
    skillGaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    rawTextSnippet: Optional[str] = None
    isAiGenerated: bool = True
    analyzedAt: Optional[str] = None
    createdAt: Optional[str] = None


class ResumeUploadResponse(BaseModel):
    id: str
    userId: str
    filename: str
    originalFilename: str
    size: str
    fileUrl: Optional[str] = None
    atsScore: Optional[int] = None
    uploadedAt: str
    createdAt: str


class ResumeAnalyzeRequest(BaseModel):
    resumeId: Optional[str] = None
    resumeText: Optional[str] = None
    jobDescription: Optional[str] = None


class ResumeListItem(BaseModel):
    id: str
    userId: str
    name: str
    filename: str
    originalFilename: str
    format: str = "PDF"
    size: str = "1.5 MB"
    fileSizeBytes: int = 0
    fileUrl: Optional[str] = None
    uploadDate: str
    uploadedAt: str
    createdAt: str
    atsScore: Optional[int] = None
    latestAnalysisId: Optional[str] = None
    isActive: bool = True
    isPrimary: bool = True

