from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    id: str
    input: str
    expectedOutput: str
    actualOutput: Optional[str] = None
    passed: Optional[bool] = None
    executionTimeMs: Optional[int] = None


class CodingProblem(BaseModel):
    id: str
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


class ExecuteCodePayload(BaseModel):
    language: str
    code: str
    customInput: Optional[str] = None
    testCases: Optional[List[TestCase]] = None


class ExecutionResult(BaseModel):
    status: str
    stdout: str
    stderr: Optional[str] = None
    executionTimeMs: int = 35
    memoryUsageMb: float = 14.5
    percentileSpeed: float = 90.0
    percentileMemory: float = 85.0
    testCaseResults: List[TestCase] = Field(default_factory=list)
    passedCount: int = 0
    totalCount: int = 0
