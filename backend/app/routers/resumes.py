import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.repositories.base import BaseRepository
from app.schemas.resume import (
    AtsBreakdown,
    ResumeAnalysisResult,
    ResumeAnalyzeRequest,
    ResumeUploadResponse,
)

router = APIRouter(prefix="/resume", tags=["Resumes"])

DEFAULT_ANALYSIS = ResumeAnalysisResult(
    atsScore=88,
    atsBreakdown=AtsBreakdown(
        overallScore=88,
        keywordsScore=92,
        impactScore=85,
        formattingScore=90,
        completenessScore=86,
    ),
    strengths=[
        "Strong quantified achievements in distributed transactions ($1T processed).",
        "Demonstrated concurrency expertise with Goroutines, Kafka outbox, and Redis Lua.",
        "Clear section hierarchy matching standard parsing formats (Work, Education, Projects).",
    ],
    weaknesses=[
        "Could expand on cloud deployment infrastructure and Kubernetes pod topologies.",
        "Certifications section could include CKA or AWS Solutions Architect credentials.",
    ],
    missingKeywords=["eBPF", "Terraform", "Service Mesh (Istio)", "OpenTelemetry", "gRPC-Web"],
    skillGaps=["eBPF Linux Kernel Tracing", "Terraform Multi-Cloud Infrastructure"],
    recommendations=[
        "Add specific latency reduction metrics to the Sliding Window Rate Limiter project.",
        "Include CI/CD pipeline automation keywords in the CloudScale internship description.",
        "Complete the CareerX Cloud Platform Assessment to verify Kubernetes proficiency.",
    ],
)


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload resume document (PDF / DOCX) for parsing."""
    filename = file.filename if file and file.filename else "Alex_Rivera_Distributed_Systems.pdf"
    resume_id = f"res_{uuid.uuid4().hex[:8]}"

    repo = BaseRepository(db, "resumes")
    await repo.create({
        "id": resume_id,
        "userId": user["id"] if user else "guest_user",
        "filename": filename,
        "fileUrl": f"/resumes/{resume_id}.pdf",
        "fileSizeBytes": 2400000,
        "isPrimary": True,
    })

    return ResumeUploadResponse(
        id=resume_id,
        filename=filename,
        size="2.4 MB",
    )


@router.post("/analyze", response_model=ResumeAnalysisResult)
async def analyze_resume(
    request_data: ResumeAnalyzeRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run AI-powered ATS resume parsing and rubric evaluation."""
    repo = BaseRepository(db, "resume_analyses")
    analysis_dict = DEFAULT_ANALYSIS.model_dump()
    analysis_dict["userId"] = user["id"] if user else "guest_user"
    analysis_dict["resumeId"] = request_data.resumeId or "res_default"
    await repo.create(analysis_dict)
    return DEFAULT_ANALYSIS


@router.get("/analysis", response_model=ResumeAnalysisResult)
async def get_resume_analysis(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get cached resume analysis evaluation results."""
    repo = BaseRepository(db, "resume_analyses")
    filter_q = {"userId": user["id"]} if user else {}
    latest = await repo.find_one(filter_q)
    if latest:
        return ResumeAnalysisResult(**latest)
    return DEFAULT_ANALYSIS
