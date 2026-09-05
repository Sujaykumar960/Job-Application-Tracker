from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.question import TestCase
from app.utils.helpers import utc_now_iso


class QuestionModel(BaseModel):
    id: Optional[str] = None
    slug: str
    title: str
    difficulty: str = "Medium"
    category: str
    tags: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)
    acceptanceRate: float = 75.0
    description: str
    constraints: List[str] = Field(default_factory=list)
    starterCode: Dict[str, str] = Field(default_factory=dict)
    testCases: List[TestCase] = Field(default_factory=list)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
