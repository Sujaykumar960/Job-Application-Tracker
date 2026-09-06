import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db
from app.schemas.ai import (
    AiResponse,
    CodeExplanationRequest,
    CodeOptimizationRequest,
    CodingHintRequest,
    ErrorExplanationRequest,
    TestGenerationRequest,
)
from app.services.ai_service import AiService

logger = logging.getLogger("careerx.ai")
router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/hint", response_model=AiResponse)
async def get_coding_hint(
    request: CodingHintRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Request a progressive algorithmic hint for active coding problem using Groq."""
    code_content = (request.code or request.userCode or "").strip()
    problem_context = (request.problemContext or "").strip()

    if not problem_context and request.problemId:
        prob = await db.questions.find_one({"$or": [{"id": request.problemId}, {"slug": request.problemId}]})
        if prob:
            problem_context = f"Title: {prob.get('title')}\nDescription: {prob.get('description', '')}"

    if not problem_context:
        problem_context = f"Problem ID: {request.problemId}"

    prompt = (
        f"Problem context / statement:\n{problem_context}\n\n"
        f"Current code ({request.language}):\n```{request.language}\n{code_content}\n```\n\n"
        "Provide a progressive algorithmic hint to help solve or optimize this problem without giving away the full answer immediately."
    )
    system_prompt = (
        "You are a Senior Principal Software Engineer and Coding Interview Mentor. "
        "Provide clear, concise, actionable algorithmic hints in Markdown."
    )

    try:
        content = await AiService.call_groq_chat(prompt=prompt, system_prompt=system_prompt)
        return AiResponse(
            title="Algorithmic Hint & Approach Strategy",
            markdownContent=content,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to generate AI coding hint: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI coding assistant is temporarily unavailable. ({e})",
        )


@router.post("/explain-error", response_model=AiResponse)
async def explain_error(request: ErrorExplanationRequest):
    """Explain compilation or runtime execution error with recommendations using Groq."""
    if not request.code.strip() and not request.errorOutput.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code snippet or error output is required.",
        )

    prompt = (
        f"Language: {request.language}\n\n"
        f"Code snippet:\n```{request.language}\n{request.code}\n```\n\n"
        f"Error output:\n```\n{request.errorOutput}\n```\n\n"
        "Explain the root cause of this error and provide the exact fix."
    )
    system_prompt = (
        "You are an expert compiler & runtime debugger. "
        "Explain the root cause clearly and provide code suggestions."
    )

    try:
        content = await AiService.call_groq_chat(prompt=prompt, system_prompt=system_prompt)
        return AiResponse(
            title="Error Diagnostic & Root Cause",
            markdownContent=content,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to explain error via AI: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI error diagnostic is temporarily unavailable. ({e})",
        )


@router.post("/explain-code", response_model=AiResponse)
async def explain_code(request: CodeExplanationRequest):
    """Step-by-step walkthrough of submitted code using Groq."""
    if not request.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code snippet is required.",
        )

    prompt = (
        f"Language: {request.language}\n\n"
        f"Code:\n```{request.language}\n{request.code}\n```\n\n"
        "Explain how this code works step-by-step, including its time and space complexity."
    )
    system_prompt = (
        "You are an expert software architect. "
        "Provide structured code explanations with Time/Space complexity audits."
    )

    try:
        content = await AiService.call_groq_chat(prompt=prompt, system_prompt=system_prompt)
        return AiResponse(
            title="Code Architectural Breakdown",
            markdownContent=content,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to explain code via AI: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI code walkthrough is temporarily unavailable. ({e})",
        )


@router.post("/optimize", response_model=AiResponse)
async def optimize_code(request: CodeOptimizationRequest):
    """Suggest optimizations for space/time complexity using Groq."""
    if not request.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code snippet is required.",
        )

    target_metric = request.targetMetric or "Both time and space"
    prompt = (
        f"Language: {request.language}\n\n"
        f"Code:\n```{request.language}\n{request.code}\n```\n\n"
        f"Target optimization: {target_metric}\n\n"
        "Provide optimized code and detailed explanation."
    )
    system_prompt = (
        "You are a high-performance systems engineer. "
        "Provide optimal algorithms, reduced memory footprint, and low-latency code."
    )

    try:
        content = await AiService.call_groq_chat(prompt=prompt, system_prompt=system_prompt)
        return AiResponse(
            title="Performance & Algorithmic Optimization",
            markdownContent=content,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to optimize code via AI: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI code optimizer is temporarily unavailable. ({e})",
        )


@router.post("/generate-tests", response_model=AiResponse)
async def generate_tests(request: TestGenerationRequest):
    """Synthesize edge-case unit test scenarios using Groq."""
    if not request.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code snippet is required.",
        )

    prompt = (
        f"Language: {request.language}\n\n"
        f"Code under test:\n```{request.language}\n{request.code}\n```\n\n"
        f"Generate 4-5 rigorous boundary, empty input, and stress test cases in {request.language}."
    )
    system_prompt = (
        "You are a Principal QA and Software Reliability Engineer. Write robust unit tests."
    )

    try:
        content = await AiService.call_groq_chat(prompt=prompt, system_prompt=system_prompt)
        return AiResponse(
            title="Generated Boundary & Stress Test Cases",
            markdownContent=content,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to generate tests via AI: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI test generator is temporarily unavailable. ({e})",
        )

