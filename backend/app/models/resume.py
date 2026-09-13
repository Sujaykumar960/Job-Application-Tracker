from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.resume import (
    AtsBreakdown,
    BulletImprovement,
    FormattingCheck,
    MissingKeyword,
    PillarMetric,
)
from app.utils.helpers import utc_now_iso


class ResumeModel(BaseModel):
    id: Optional[str] = None
    userId: str
    filename: str
    storageKey: str
    fileUrl: Optional[str] = None
    fileSizeBytes: int
    format: str = "PDF"
    mimeType: str = "application/pdf"
    isActive: bool = True
    isPrimary: bool = True
    parsedText: Optional[str] = None
    atsScore: Optional[int] = None
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None


class ResumeAnalysisModel(BaseModel):
    id: Optional[str] = None
    resumeId: str
    userId: str
    atsScore: int = 0
    atsBreakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    pillars: List[PillarMetric] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missingKeywords: List[MissingKeyword] = Field(default_factory=list)
    extractedSkills: Dict[str, List[str]] = Field(default_factory=dict)
    bulletImprovements: List[BulletImprovement] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    formattingHealth: List[FormattingCheck] = Field(default_factory=list)
    rawResumeText: Optional[str] = None
    jobDescription: Optional[str] = None
    analyzedAt: str = Field(default_factory=utc_now_iso)
    modelUsed: Optional[str] = None
    createdAt: str = Field(default_factory=utc_now_iso)
