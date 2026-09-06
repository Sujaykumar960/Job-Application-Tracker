from typing import Optional
from pydantic import BaseModel


class AiResponse(BaseModel):
    title: str
    markdownContent: str
    suggestedCodeSnippet: Optional[str] = None


class CodingHintRequest(BaseModel):
    problemId: str
    userCode: Optional[str] = None
    code: Optional[str] = None
    language: str = "go"
    problemContext: Optional[str] = None


class ErrorExplanationRequest(BaseModel):
    code: str
    errorOutput: str
    language: str = "go"


class CodeExplanationRequest(BaseModel):
    code: str
    language: str = "go"


class CodeOptimizationRequest(BaseModel):
    code: str
    language: str = "go"
    targetMetric: Optional[str] = None


class TestGenerationRequest(BaseModel):
    code: str
    language: str = "go"
