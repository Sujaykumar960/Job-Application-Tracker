from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import (
    ResumeActiveToggleResponse,
    ResumeAnalysisResult,
    ResumeAnalyzeRequest,
    ResumeDeleteResponse,
    ResumeItemResponse,
    ResumeUploadResponse,
)
from app.services.ai_service import get_resume_ai_service
from app.storage import get_storage_backend
from app.utils.file_validation import validate_file_content
from app.utils.helpers import utc_now_iso
from app.utils.text_extraction import extract_resume_text

router = APIRouter(tags=["Resume Management & AI ATS Analysis"])


def _format_file_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024:
        return f"{(size_bytes / (1024 * 1024)):.1f} MB"
    return f"{(size_bytes / 1024):.1f} KB"


def _doc_to_resume_item(doc: Dict[str, Any]) -> ResumeItemResponse:
    size_bytes = doc.get("fileSizeBytes") or doc.get("sizeBytes") or 0
    size_str = doc.get("size") or _format_file_size(size_bytes)
    fmt = doc.get("format") or ("DOCX" if (doc.get("filename") or "").endswith(".docx") else "PDF")
    created_at = doc.get("createdAt") or utc_now_iso()
    upload_date = doc.get("uploadDate") or created_at[:10]

    return ResumeItemResponse(
        id=str(doc.get("id") or doc.get("_id", "")),
        name=doc.get("filename") or doc.get("name") or "Resume.pdf",
        filename=doc.get("filename") or doc.get("name") or "Resume.pdf",
        format=fmt,
        size=size_str,
        fileSizeBytes=size_bytes,
        uploadDate=upload_date,
        atsScore=doc.get("atsScore"),
        isActive=bool(doc.get("isActive", False)),
        createdAt=created_at,
        updatedAt=doc.get("updatedAt"),
    )


@router.post("/resumes/upload", response_model=ResumeItemResponse, status_code=status.HTTP_201_CREATED)
@router.post("/resume/upload", response_model=ResumeItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Securely upload a PDF or DOCX resume, extract its text, and persist to storage and MongoDB."""
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid resume file (PDF or DOCX) must be provided.",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )

    # 1. Content & signature validation (magic bytes, max 10MB)
    sanitized_filename, validated_content_type = validate_file_content(
        filename=file.filename,
        content=content,
        claimed_content_type=file.content_type,
        max_size_bytes=settings.RESUME_MAX_UPLOAD_SIZE_BYTES,
    )

    ext = Path(sanitized_filename).suffix.lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF (.pdf) and Word (.docx) files are supported for resumes.",
        )

    file_format = "DOCX" if ext == ".docx" else "PDF"

    # 2. Extract text immediately to guarantee file is readable and parseable
    extracted_text = extract_resume_text(content, file_format)

    # 3. Store file securely (path traversal protected)
    resume_id = f"res_{uuid.uuid4().hex[:12]}"
    storage_key = f"resumes/{user['id']}/{resume_id}{ext}"
    storage = get_storage_backend()
    await storage.save(storage_key, content, validated_content_type)

    # 4. Check if user already has any resumes
    repo = ResumeRepository(db)
    existing_resumes = await repo.get_user_resumes(user["id"])
    is_first = len(existing_resumes) == 0

    now = utc_now_iso()
    resume_doc = {
        "id": resume_id,
        "userId": user["id"],
        "filename": sanitized_filename,
        "storageKey": storage_key,
        "fileSizeBytes": len(content),
        "format": file_format,
        "mimeType": validated_content_type,
        "isActive": is_first,  # First resume is automatically active
        "isPrimary": is_first,
        "parsedText": extracted_text,
        "atsScore": None,
        "createdAt": now,
        "updatedAt": now,
    }

    created = await repo.create_resume(resume_doc)
    return _doc_to_resume_item(created)


@router.get("/resumes", response_model=List[ResumeItemResponse])
@router.get("/resume", response_model=List[ResumeItemResponse])
async def list_resumes(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all resumes belonging strictly to the authenticated user."""
    repo = ResumeRepository(db)
    docs = await repo.get_user_resumes(user["id"])
    return [_doc_to_resume_item(d) for d in docs]


@router.get("/resumes/active", response_model=ResumeItemResponse)
@router.get("/resume/active", response_model=ResumeItemResponse)
async def get_active_resume(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve the currently active resume for the authenticated user."""
    repo = ResumeRepository(db)
    doc = await repo.get_active_resume(user["id"])
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active resume found for the current user.",
        )
    return _doc_to_resume_item(doc)


@router.patch("/resumes/{resume_id}/active", response_model=ResumeActiveToggleResponse)
@router.patch("/resume/{resume_id}/active", response_model=ResumeActiveToggleResponse)
async def set_active_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Activate specified resume. Strictly checks user ownership before modifying."""
    repo = ResumeRepository(db)
    # Check existence
    existing = await repo.get_resume_by_id(resume_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID '{resume_id}' not found.",
        )

    # Check ownership
    if existing["userId"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to modify this resume.",
        )

    updated = await repo.set_active_resume(user["id"], resume_id)
    return ResumeActiveToggleResponse(
        success=True,
        id=resume_id,
        isActive=True,
        message="Resume set as active document successfully.",
    )


@router.delete("/resumes/{resume_id}", response_model=ResumeDeleteResponse)
@router.delete("/resume/{resume_id}", response_model=ResumeDeleteResponse)
async def delete_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete resume from database, storage backend, and delete associated analyses."""
    repo = ResumeRepository(db)
    existing = await repo.get_resume_by_id(resume_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID '{resume_id}' not found.",
        )

    if existing["userId"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to delete this resume.",
        )

    # Delete from storage backend
    storage = get_storage_backend()
    storage_key = existing.get("storageKey")
    if storage_key:
        await storage.delete(storage_key)

    # Delete from MongoDB
    await repo.delete_resume(user["id"], resume_id)

    return ResumeDeleteResponse(
        success=True,
        id=resume_id,
        message="Resume and associated analysis records deleted successfully.",
    )


@router.post("/resumes/analyze", response_model=ResumeAnalysisResult)
@router.post("/resume/analyze", response_model=ResumeAnalysisResult)
async def analyze_resume_generic(
    payload: Optional[ResumeAnalyzeRequest] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run real Groq AI ATS analysis for the user's active resume or specified resumeId."""
    repo = ResumeRepository(db)
    target_id = payload.resumeId if payload and payload.resumeId else None

    if target_id:
        resume = await repo.get_resume_by_id(target_id)
    else:
        resume = await repo.get_active_resume(user["id"])

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found to analyze. Please upload a resume first.",
        )

    # STRICT SECURITY ORDER: Ownership verification MUST precede file reading and AI processing
    if resume["userId"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to analyze this resume.",
        )

    # Extract or retrieve text
    resume_text = resume.get("parsedText")
    if not resume_text:
        storage = get_storage_backend()
        storage_key = resume.get("storageKey")
        if not storage_key or not await storage.exists(storage_key):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume file not found in storage.",
            )
        file_bytes = await storage.get(storage_key)
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read resume file bytes.",
            )
        fmt = resume.get("format") or "PDF"
        resume_text = extract_resume_text(file_bytes, fmt)

    job_desc = payload.jobDescription if payload else None

    # Call real Groq AI service
    ai_service = get_resume_ai_service()
    analysis_result = await ai_service.analyze_resume(
        resume_text=resume_text,
        job_description=job_desc,
    )

    # Persist analysis to MongoDB
    analysis_result.userId = user["id"]
    analysis_result.resumeId = resume["id"]
    analysis_dict = analysis_result.model_dump()
    analysis_dict["userId"] = user["id"]
    analysis_dict["resumeId"] = resume["id"]
    await repo.save_analysis(analysis_dict)

    # Update resume document with real ATS score
    await repo.update_resume_score(resume["id"], analysis_result.atsScore)

    return analysis_result


@router.post("/resumes/{resume_id}/analyze", response_model=ResumeAnalysisResult)
@router.post("/resume/{resume_id}/analyze", response_model=ResumeAnalysisResult)
async def analyze_specific_resume(
    resume_id: str,
    payload: Optional[ResumeAnalyzeRequest] = None,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run real Groq AI ATS analysis for a specific resume by ID."""
    req = payload or ResumeAnalyzeRequest()
    req.resumeId = resume_id
    return await analyze_resume_generic(payload=req, user=user, db=db)


@router.get("/resumes/analysis", response_model=ResumeAnalysisResult)
@router.get("/resume/analysis", response_model=ResumeAnalysisResult)
async def get_latest_analysis(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve the most recent analysis record for the current user."""
    repo = ResumeRepository(db)
    active = await repo.get_active_resume(user["id"])
    active_id = active["id"] if active else None

    latest = await repo.get_latest_analysis(user["id"], resume_id=active_id)
    if not latest and active_id:
        # Check if any analysis exists for user
        latest = await repo.get_latest_analysis(user["id"])

    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous analysis found. Please run an analysis on your resume.",
        )

    return ResumeAnalysisResult(**latest)


@router.get("/resumes/{resume_id}/analysis", response_model=ResumeAnalysisResult)
@router.get("/resume/{resume_id}/analysis", response_model=ResumeAnalysisResult)
async def get_specific_resume_analysis(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve the latest analysis for a specific resume ID, strictly verifying ownership."""
    repo = ResumeRepository(db)
    resume = await repo.get_resume_by_id(resume_id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID '{resume_id}' not found.",
        )

    if resume["userId"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view analysis for this resume.",
        )

    analysis = await repo.get_latest_analysis(user["id"], resume_id=resume_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis has been generated for resume '{resume_id}' yet.",
        )

    return ResumeAnalysisResult(**analysis)
