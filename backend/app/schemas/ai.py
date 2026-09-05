from typing import Optional
from pydantic import BaseModel


class AiResponse(BaseModel):
    title: str
    markdownContent: str
    suggestedCodeSnippet: Optional[str] = None


class CodingHintRequest(BaseModel):
    problemId: str
    userCode: str
    language: str


class ErrorExplanationRequest(BaseModel):
    code: str
    errorOutput: str
    language: str


class CodeExplanationRequest(BaseModel):
    code: str
    language: str


class CodeOptimizationRequest(BaseModel):
    code: str
    language: str


class TestGenerationRequest(BaseModel):
    code: str
    language: str
