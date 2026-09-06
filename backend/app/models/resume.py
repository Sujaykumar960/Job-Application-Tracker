from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.resume import AtsBreakdown
from app.utils.helpers import utc_now_iso


class ResumeModel(BaseModel):
    id: Optional[str] = None
    userId: str
    filename: str
    fileUrl: str
    fileSizeBytes: int
    mimeType: str = "application/pdf"
    isPrimary: bool = True
    parsedText: Optional[str] = None
    atsScore: Optional[int] = 88
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None


class ResumeAnalysisModel(BaseModel):
    id: Optional[str] = None
    resumeId: str
    userId: str
    atsScore: int = 88
    breakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missingKeywords: List[str] = Field(default_factory=list)
    skillGaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
