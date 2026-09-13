from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class RadarDimensionItem(BaseModel):
    subject: str
    candidate: int = Field(default=0, ge=0, le=100)
    market: int = Field(default=0, ge=0, le=100)


class CategoryProficiencyItem(BaseModel):
    name: str
    score: int = Field(default=0, ge=0, le=100)
    level: str = "Proficient"
    verified: bool = True


class CurrentSkillItem(BaseModel):
    name: str
    category: str = "General"
    level: str = "Proficient"
    percent: int = Field(default=75, ge=0, le=100)
    verified: bool = True


class MissingSkillItem(BaseModel):
    id: str
    skill: str
    category: str = "General"
    priority: Literal["High", "Medium", "Low"] = "Medium"
    requiredBy: str = "Market Requirement"
    estHours: str = "3.0 hrs"
    moduleTitle: str = "Target Competency Module"
    moduleSlug: str = "/learning"
    rationale: str = "Required by target job listings."


class SkillGapSummary(BaseModel):
    totalProfileSkills: int = 0
    marketAlignment: int = 0
    criticalGaps: int = 0
    remediationModules: int = 0


class SkillGapAnalysisResponse(BaseModel):
    summary: SkillGapSummary = Field(default_factory=SkillGapSummary)
    radarData: List[RadarDimensionItem] = Field(default_factory=list)
    categoryProficiency: List[CategoryProficiencyItem] = Field(default_factory=list)
    currentSkills: List[CurrentSkillItem] = Field(default_factory=list)
    missingSkills: List[MissingSkillItem] = Field(default_factory=list)
    targetTrack: str = "distributed"
    hasActiveResume: bool = False
    hasProfileSkills: bool = False
    message: Optional[str] = None


class CustomJobMatchRequest(BaseModel):
    jobDescription: str
    jobTitle: Optional[str] = "Custom Target Opportunity"
    companyName: Optional[str] = "Target Company"
    resumeId: Optional[str] = None
