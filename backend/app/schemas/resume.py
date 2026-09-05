from typing import List, Optional
from pydantic import BaseModel, Field


class AtsBreakdown(BaseModel):
    overallScore: int = 88
    keywordsScore: int = 92
    impactScore: int = 85
    formattingScore: int = 90
    completenessScore: int = 86


class ResumeAnalysisResult(BaseModel):
    atsScore: int = 88
    atsBreakdown: AtsBreakdown = Field(default_factory=AtsBreakdown)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missingKeywords: List[str] = Field(default_factory=list)
    skillGaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class ResumeUploadResponse(BaseModel):
    id: str
    filename: str
    size: str


class ResumeAnalyzeRequest(BaseModel):
    resumeId: Optional[str] = None
