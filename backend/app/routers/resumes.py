import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING

from app.config import settings
from app.dependencies import get_current_active_user, get_db
from app.repositories.file_repository import FileRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.resume import (
    AtsBreakdown,
    ResumeAnalysisResult,
    ResumeAnalyzeRequest,
    ResumeListItem,
    ResumeUploadResponse,
)
from app.services.ai_service import AiService, extract_text_from_bytes
from app.storage import get_storage_backend
from app.utils.file_validation import sanitize_filename, validate_file_content
from app.utils.helpers import utc_now_iso

router = APIRouter(tags=["Resumes & AI ATS Screening"])

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB maximum file size
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx", ".doc"}


def _user_filter(user_id: str) -> Dict[str, Any]:
    """Helper to query users collection by string id or MongoDB ObjectId safely."""
    if not user_id:
        return {"id": ""}
    s_id = str(user_id)
    if ObjectId.is_valid(s_id):
        return {"$or": [{"_id": ObjectId(s_id)}, {"id": s_id}]}
    return {"id": s_id}


# ==============================================================================
# 1. UPLOAD RESUME (POST /upload)
# ==============================================================================
@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Upload and persist candidate resume strictly bound to the authenticated user.
    Enforces user isolation and security rules:
      1. Authenticate user from JWT dependency (never trust userId/ownerId/candidateId from request).
      2. Validate file type (PDF, DOCX).
      3. Validate file size (max ~5MB).
      4. Generate isolated unique storage key: resumes/{userId}/{resumeId}/{sanitized_filename}
      5. Store file bytes via storage abstraction.
      6. Create MongoDB resume record with userId = authenticated user ID.
      7. Return only that user's resume metadata.
    """
    user_id = user["id"]
    raw_filename = file.filename or "resume.pdf"
    sanitized_filename = sanitize_filename(raw_filename)
    ext = Path(sanitized_filename).suffix.lower()

    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Only PDF and DOCX documents are permitted for resume analysis.",
        )

    # Read binary content up to size limit + 1 byte for detection
    content = await file.read(MAX_RESUME_SIZE_BYTES + 1)
    if len(content) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail="File exceeds maximum allowed size of 5 MB.",
        )

    clean_filename, content_type = validate_file_content(
        filename=sanitized_filename,
        content=content,
        claimed_content_type=file.content_type,
        max_size_bytes=MAX_RESUME_SIZE_BYTES,
    )

    resume_id = f"res_{uuid.uuid4().hex[:10]}"
    # Isolated per-user, per-resume storage hierarchy: resumes/{userId}/{resumeId}/{filename}
    storage_key = f"resumes/{user_id}/{resume_id}/{clean_filename}"
    storage = get_storage_backend()
    await storage.save(storage_key, content, content_type)

    # Extract clean text from binary
    extracted_text = extract_text_from_bytes(content, clean_filename)
    now_iso = utc_now_iso()
    size_mb_str = f"{len(content) / (1024 * 1024):.2f} MB"
    file_url = f"/api/resumes/{resume_id}/file"

    try:
        file_repo = FileRepository(db)
        file_meta = await file_repo.create_file_metadata(
            owner_id=user_id,
            original_filename=clean_filename,
            content_type=content_type,
            size=len(content),
            storage_key=storage_key,
            purpose="resume",
        )

        # Deactivate previous resumes for this specific user only
        await db.resumes.update_many(
            {"userId": user_id},
            {"$set": {"isPrimary": False, "isActive": False, "updatedAt": now_iso}},
        )

        resume_doc = {
            "id": resume_id,
            "userId": user_id,
            "originalFilename": clean_filename,
            "filename": clean_filename,
            "fileId": file_meta["id"],
            "fileUrl": file_url,
            "storageKey": storage_key,
            "contentType": content_type,
            "fileType": content_type,
            "fileSizeBytes": len(content),
            "size": size_mb_str,
            "fileSize": size_mb_str,
            "extractedText": extracted_text,
            "parsedText": extracted_text,
            "isPrimary": True,
            "isActive": True,
            "latestAnalysisId": None,
            "atsScore": None,
            "uploadedAt": now_iso,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        await db.resumes.insert_one(resume_doc)

        # Mark as active resume on user and profile records for current user only
        await db.users.update_one(_user_filter(user_id), {"$set": {"activeResumeId": resume_id}})
        await db.profiles.update_one({"userId": user_id}, {"$set": {"activeResumeId": resume_id}})

        computed_ats_score: Optional[int] = None

        # Automatically execute AI ATS parsing for the uploaded document
        if extracted_text.strip():
            try:
                analysis = await AiService.analyze_resume_with_groq(extracted_text)
                analysis_id = f"ana_{uuid.uuid4().hex[:10]}"
                computed_ats_score = analysis.atsScore

                analysis_doc = analysis.model_dump()
                analysis_doc["id"] = analysis_id
                analysis_doc["userId"] = user_id
                analysis_doc["resumeId"] = resume_id
                analysis_doc["originalFilename"] = clean_filename
                analysis_doc["filename"] = clean_filename
                analysis_doc["status"] = "completed"
                analysis_doc["engine"] = getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
                analysis_doc["analyzedAt"] = now_iso
                analysis_doc["createdAt"] = now_iso

                await db.resume_analyses.insert_one(analysis_doc)

                # Update resume record with latest analysis link
                await db.resumes.update_one(
                    {"id": resume_id, "userId": user_id},
                    {"$set": {"latestAnalysisId": analysis_id, "atsScore": computed_ats_score, "updatedAt": now_iso}},
                )

                # Update user profile atsScore
                await db.profiles.update_one({"userId": user_id}, {"$set": {"atsScore": computed_ats_score}})
                await db.users.update_one(_user_filter(user_id), {"$set": {"atsScore": computed_ats_score}})
            except Exception as ai_err:
                import logging
                logging.getLogger("careerx.resumes").warning("Initial Groq AI analysis failed on upload: %s", ai_err)
    except Exception:
        await storage.delete(storage_key)
        raise

    return ResumeUploadResponse(
        id=resume_id,
        userId=user_id,
        filename=clean_filename,
        originalFilename=clean_filename,
        size=size_mb_str,
        fileUrl=file_url,
        atsScore=computed_ats_score,
        uploadedAt=now_iso,
        createdAt=now_iso,
    )


# ==============================================================================
# 2. LIST RESUMES (GET / and GET /list)
# ==============================================================================
@router.get("", response_model=List[ResumeListItem])
@router.get("/list", response_model=List[ResumeListItem])
async def list_user_resumes(
    userId: Optional[str] = Query(None, description="Untrusted query param, ignored in favor of JWT identity"),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List all uploaded resumes strictly owned by the authenticated user.
    Never trusts frontend query parameters; filtered exclusively by userId == user['id'].
    """
    user_id = user["id"]
    cursor = db.resumes.find({"userId": user_id}).sort("createdAt", DESCENDING)
    docs = await cursor.to_list(length=50)

    items: List[ResumeListItem] = []
    for r in docs:
        filename = r.get("filename") or r.get("originalFilename") or "Resume.pdf"
        ext = Path(filename).suffix.lower()
        items.append(
            ResumeListItem(
                id=r["id"],
                userId=r["userId"],
                name=filename,
                filename=filename,
                originalFilename=r.get("originalFilename") or filename,
                format="DOCX" if ext in [".docx", ".doc"] else "PDF",
                size=r.get("size") or r.get("fileSize") or f"{(r.get('fileSizeBytes', 0) / (1024 * 1024)):.2f} MB",
                fileSizeBytes=r.get("fileSizeBytes", 0),
                fileUrl=r.get("fileUrl") or f"/api/resumes/{r['id']}/file",
                uploadDate=r.get("uploadedAt") or r.get("createdAt") or utc_now_iso(),
                uploadedAt=r.get("uploadedAt") or r.get("createdAt") or utc_now_iso(),
                createdAt=r.get("createdAt") or utc_now_iso(),
                atsScore=r.get("atsScore"),
                latestAnalysisId=r.get("latestAnalysisId"),
                isActive=r.get("isActive", True),
                isPrimary=r.get("isPrimary", True),
            )
        )
    return items


# ==============================================================================
# 3. GET ACTIVE RESUME (GET /active AND GET /current)
# ==============================================================================
@router.get("/active", response_model=Optional[ResumeListItem])
@router.get("/current", response_model=Optional[ResumeListItem])
async def get_active_resume(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve active/primary resume for the authenticated user.
    Guarantees activeResumeId belongs to current user.
    """
    user_id = user["id"]
    user_doc = await db.users.find_one(_user_filter(user_id))
    active_id = (user_doc or {}).get("activeResumeId")

    doc = None
    if active_id:
        doc = await db.resumes.find_one({"id": active_id, "userId": user_id})

    if not doc:
        doc = await db.resumes.find_one({"userId": user_id, "isPrimary": True})

    if not doc:
        doc = await db.resumes.find_one({"userId": user_id}, sort=[("createdAt", DESCENDING)])

    if not doc:
        return None

    filename = doc.get("filename") or doc.get("originalFilename") or "Resume.pdf"
    ext = Path(filename).suffix.lower()
    return ResumeListItem(
        id=doc["id"],
        userId=doc["userId"],
        name=filename,
        filename=filename,
        originalFilename=doc.get("originalFilename") or filename,
        format="DOCX" if ext in [".docx", ".doc"] else "PDF",
        size=doc.get("size") or doc.get("fileSize") or f"{(doc.get('fileSizeBytes', 0) / (1024 * 1024)):.2f} MB",
        fileSizeBytes=doc.get("fileSizeBytes", 0),
        fileUrl=doc.get("fileUrl") or f"/api/resumes/{doc['id']}/file",
        uploadDate=doc.get("uploadedAt") or doc.get("createdAt") or utc_now_iso(),
        uploadedAt=doc.get("uploadedAt") or doc.get("createdAt") or utc_now_iso(),
        createdAt=doc.get("createdAt") or utc_now_iso(),
        atsScore=doc.get("atsScore"),
        latestAnalysisId=doc.get("latestAnalysisId"),
        isActive=doc.get("isActive", True),
        isPrimary=doc.get("isPrimary", True),
    )


# ==============================================================================
# 4. GET LATEST USER RESUME ANALYSIS (GET /analysis)
# ==============================================================================
@router.get("/analysis", response_model=Optional[ResumeAnalysisResult])
async def get_latest_user_analysis(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get latest resume analysis strictly belonging to the authenticated user.
    """
    user_id = user["id"]
    latest = await db.resume_analyses.find_one(
        {"userId": user_id},
        sort=[("createdAt", DESCENDING)],
    )
    if not latest:
        return None

    return ResumeAnalysisResult(**latest)


# ==============================================================================
# 5. ANALYZE ACTIVE RESUME (POST /analyze)
# ==============================================================================
@router.post("/analyze", response_model=ResumeAnalysisResult)
async def analyze_active_resume(
    request_data: Optional[ResumeAnalyzeRequest] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Run AI ATS analysis on active/provided resume for authenticated user.
    """
    return await _execute_resume_analysis(
        resume_id=(request_data.resumeId if request_data else None),
        request_data=request_data,
        user=user,
        db=db,
    )


# ==============================================================================
# 6. DOWNLOAD / VIEW RESUME FILE (GET /{resume_id}/file AND GET /{resume_id}/download)
# ==============================================================================
@router.get("/{resume_id}/file")
@router.get("/{resume_id}/download")
async def download_resume_file(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Download or stream a candidate resume file.
    Strictly verifies authenticated user ownership (resume.userId == current_user.id).
    """
    user_id = user["id"]
    resume_doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    storage_key = resume_doc.get("storageKey")
    if not storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume storage reference missing.",
        )

    storage = get_storage_backend()
    if not await storage.exists(storage_key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file content not found in storage repository.",
        )

    content_type = resume_doc.get("contentType") or "application/pdf"
    filename = resume_doc.get("originalFilename") or resume_doc.get("filename") or "resume.pdf"
    file_size = resume_doc.get("fileSizeBytes")

    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
    }
    if file_size:
        headers["Content-Length"] = str(file_size)

    return StreamingResponse(
        storage.get_stream(storage_key),
        media_type=content_type,
        headers=headers,
    )


# ==============================================================================
# 7. GET SINGLE RESUME (GET /{resume_id})
# ==============================================================================
@router.get("/{resume_id}", response_model=ResumeListItem)
async def get_single_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve single resume document strictly verified with dual ownership:
      query: { id: resume_id, userId: current_user.id }
    """
    user_id = user["id"]
    doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    filename = doc.get("filename") or doc.get("originalFilename") or "Resume.pdf"
    ext = Path(filename).suffix.lower()
    return ResumeListItem(
        id=doc["id"],
        userId=doc["userId"],
        name=filename,
        filename=filename,
        originalFilename=doc.get("originalFilename") or filename,
        format="DOCX" if ext in [".docx", ".doc"] else "PDF",
        size=doc.get("size") or doc.get("fileSize") or f"{(doc.get('fileSizeBytes', 0) / (1024 * 1024)):.2f} MB",
        fileSizeBytes=doc.get("fileSizeBytes", 0),
        fileUrl=doc.get("fileUrl") or f"/api/resumes/{doc['id']}/file",
        uploadDate=doc.get("uploadedAt") or doc.get("createdAt") or utc_now_iso(),
        uploadedAt=doc.get("uploadedAt") or doc.get("createdAt") or utc_now_iso(),
        createdAt=doc.get("createdAt") or utc_now_iso(),
        atsScore=doc.get("atsScore"),
        latestAnalysisId=doc.get("latestAnalysisId"),
        isActive=doc.get("isActive", True),
        isPrimary=doc.get("isPrimary", True),
    )


# ==============================================================================
# 8. SET ACTIVE RESUME (PATCH /{resume_id}/active AND PUT /{resume_id}/active)
# ==============================================================================
@router.patch("/{resume_id}/active", response_model=ResumeListItem)
@router.put("/{resume_id}/active", response_model=ResumeListItem)
async def set_active_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Set a user's active/primary resume. Verifies resume belongs to current user.
    Updates users.activeResumeId and profiles.activeResumeId.
    """
    user_id = user["id"]
    now_iso = utc_now_iso()

    resume_doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    # Deactivate other resumes for this user
    await db.resumes.update_many(
        {"userId": user_id},
        {"$set": {"isPrimary": False, "isActive": False, "updatedAt": now_iso}},
    )

    # Activate selected resume
    await db.resumes.update_one(
        {"id": resume_id, "userId": user_id},
        {"$set": {"isPrimary": True, "isActive": True, "updatedAt": now_iso}},
    )

    # Update user & profile activeResumeId
    await db.users.update_one(
        _user_filter(user_id),
        {"$set": {"activeResumeId": resume_id, "atsScore": resume_doc.get("atsScore")}},
    )
    await db.profiles.update_one(
        {"userId": user_id},
        {"$set": {"activeResumeId": resume_id, "atsScore": resume_doc.get("atsScore")}},
    )

    resume_doc["isPrimary"] = True
    resume_doc["isActive"] = True
    filename = resume_doc.get("filename") or resume_doc.get("originalFilename") or "Resume.pdf"
    ext = Path(filename).suffix.lower()

    return ResumeListItem(
        id=resume_doc["id"],
        userId=resume_doc["userId"],
        name=filename,
        filename=filename,
        originalFilename=resume_doc.get("originalFilename") or filename,
        format="DOCX" if ext in [".docx", ".doc"] else "PDF",
        size=resume_doc.get("size") or resume_doc.get("fileSize") or f"{(resume_doc.get('fileSizeBytes', 0) / (1024 * 1024)):.2f} MB",
        fileSizeBytes=resume_doc.get("fileSizeBytes", 0),
        fileUrl=resume_doc.get("fileUrl") or f"/api/resumes/{resume_doc['id']}/file",
        uploadDate=resume_doc.get("uploadedAt") or resume_doc.get("createdAt") or utc_now_iso(),
        uploadedAt=resume_doc.get("uploadedAt") or resume_doc.get("createdAt") or utc_now_iso(),
        createdAt=resume_doc.get("createdAt") or utc_now_iso(),
        atsScore=resume_doc.get("atsScore"),
        latestAnalysisId=resume_doc.get("latestAnalysisId"),
        isActive=True,
        isPrimary=True,
    )


# ==============================================================================
# 9. ANALYZE SPECIFIC RESUME (POST /{resume_id}/analyze)
# ==============================================================================
@router.post("/{resume_id}/analyze", response_model=ResumeAnalysisResult)
async def analyze_specific_resume(
    resume_id: str,
    request_data: Optional[ResumeAnalyzeRequest] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Run AI-powered ATS analysis on a specific resume belonging to authenticated user.
    Enforces dual ownership:
      - resume.userId == user['id']
      - resume_analysis.userId == user['id']
      - resume_analysis.resumeId == resume.id
    """
    return await _execute_resume_analysis(
        resume_id=resume_id,
        request_data=request_data,
        user=user,
        db=db,
    )


# ==============================================================================
# 10. GET LATEST RESUME ANALYSIS FOR SPECIFIC RESUME (GET /{resume_id}/analysis)
# ==============================================================================
@router.get("/{resume_id}/analysis", response_model=Optional[ResumeAnalysisResult])
async def get_resume_analysis(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get latest analysis strictly verifying:
      - resume belongs to current user
      - analysis belongs to current user
      - analysis belongs to specified resume
    Never queries analysis by resumeId alone.
    """
    user_id = user["id"]

    # 1. Verify resume ownership first
    resume_doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    # 2. Query analysis with dual ownership check
    latest = await db.resume_analyses.find_one(
        {"resumeId": resume_id, "userId": user_id},
        sort=[("createdAt", DESCENDING)],
    )

    if not latest:
        return None

    return ResumeAnalysisResult(**latest)


# ==============================================================================
# 11. GET ALL ANALYSES FOR RESUME (GET /{resume_id}/analyses)
# ==============================================================================
@router.get("/{resume_id}/analyses", response_model=List[ResumeAnalysisResult])
async def get_all_analyses_for_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve analysis history for a specific resume belonging to authenticated user.
    """
    user_id = user["id"]

    # Verify resume ownership
    resume_doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    cursor = db.resume_analyses.find(
        {"resumeId": resume_id, "userId": user_id}
    ).sort("createdAt", DESCENDING)

    docs = await cursor.to_list(length=50)
    return [ResumeAnalysisResult(**d) for d in docs]


# ==============================================================================
# 12. DELETE RESUME (DELETE /{resume_id})
# ==============================================================================
@router.delete("/{resume_id}", response_model=StandardSuccessResponse)
async def delete_user_resume(
    resume_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Delete a specific resume and all its associated analyses strictly for the authenticated user.
    """
    user_id = user["id"]
    resume_doc = await db.resumes.find_one({"id": resume_id, "userId": user_id})
    if not resume_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume '{resume_id}' not found.",
        )

    # Delete physical storage file
    storage_key = resume_doc.get("storageKey")
    if storage_key:
        storage = get_storage_backend()
        await storage.delete(storage_key)

    # Delete file metadata
    file_id = resume_doc.get("fileId")
    if file_id:
        await db.files.delete_one({"id": file_id, "ownerId": user_id})

    # Delete resume and associated analyses for this user
    await db.resumes.delete_one({"id": resume_id, "userId": user_id})
    await db.resume_analyses.delete_many({"resumeId": resume_id, "userId": user_id})

    # If deleted resume was primary, elect the latest remaining resume
    if resume_doc.get("isPrimary"):
        remaining = await db.resumes.find_one({"userId": user_id}, sort=[("createdAt", DESCENDING)])
        if remaining:
            await db.resumes.update_one(
                {"id": remaining["id"], "userId": user_id},
                {"$set": {"isPrimary": True, "isActive": True}},
            )
            await db.users.update_one(
                _user_filter(user_id),
                {"$set": {"activeResumeId": remaining["id"], "atsScore": remaining.get("atsScore")}},
            )
            await db.profiles.update_one(
                {"userId": user_id},
                {"$set": {"activeResumeId": remaining["id"], "atsScore": remaining.get("atsScore")}},
            )
        else:
            await db.users.update_one(_user_filter(user_id), {"$unset": {"activeResumeId": "", "atsScore": ""}})
            await db.profiles.update_one({"userId": user_id}, {"$unset": {"activeResumeId": "", "atsScore": ""}})
    else:
        user_doc = await db.users.find_one(_user_filter(user_id))
        if (user_doc or {}).get("activeResumeId") == resume_id:
            remaining = await db.resumes.find_one({"userId": user_id}, sort=[("createdAt", DESCENDING)])
            if remaining:
                await db.resumes.update_one(
                    {"id": remaining["id"], "userId": user_id},
                    {"$set": {"isPrimary": True, "isActive": True}},
                )
                await db.users.update_one(
                    _user_filter(user_id),
                    {"$set": {"activeResumeId": remaining["id"], "atsScore": remaining.get("atsScore")}},
                )
                await db.profiles.update_one(
                    {"userId": user_id},
                    {"$set": {"activeResumeId": remaining["id"], "atsScore": remaining.get("atsScore")}},
                )
            else:
                await db.users.update_one(_user_filter(user_id), {"$unset": {"activeResumeId": "", "atsScore": ""}})
                await db.profiles.update_one({"userId": user_id}, {"$unset": {"activeResumeId": "", "atsScore": ""}})

    return StandardSuccessResponse(
        success=True,
        message=f"Resume '{resume_id}' and all associated analyses have been permanently deleted.",
    )


# ==============================================================================
# INTERNAL HELPER FOR ANALYSIS EXECUTION
# ==============================================================================
async def _execute_resume_analysis(
    resume_id: Optional[str],
    request_data: Optional[ResumeAnalyzeRequest],
    user: Dict[str, Any],
    db: AsyncIOMotorDatabase,
) -> ResumeAnalysisResult:
    user_id = user["id"]
    target_id = resume_id or (request_data.resumeId if request_data else None)
    resume_text = request_data.resumeText if request_data else ""
    job_desc = request_data.jobDescription if request_data else None

    resume_doc = None
    if target_id:
        resume_doc = await db.resumes.find_one({"id": target_id, "userId": user_id})
        if not resume_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume '{target_id}' not found.",
            )
        if not resume_text:
            resume_text = resume_doc.get("extractedText", "")
    else:
        # Check active primary resume for user
        user_doc = await db.users.find_one(_user_filter(user_id))
        active_id = (user_doc or {}).get("activeResumeId")
        if active_id:
            resume_doc = await db.resumes.find_one({"id": active_id, "userId": user_id})
        if not resume_doc:
            resume_doc = await db.resumes.find_one({"userId": user_id, "isPrimary": True})
        if not resume_doc:
            resume_doc = await db.resumes.find_one({"userId": user_id}, sort=[("createdAt", DESCENDING)])
        if resume_doc:
            target_id = resume_doc["id"]
            if not resume_text:
                resume_text = resume_doc.get("extractedText", "")

    if not resume_text or not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No resume text available to analyze. Please upload a resume document first.",
        )

    # Invoke Groq LLM
    analysis = await AiService.analyze_resume_with_groq(
        resume_text=resume_text,
        job_description=job_desc,
    )

    analysis_id = f"ana_{uuid.uuid4().hex[:10]}"
    now_iso = utc_now_iso()
    resolved_resume_id = target_id or (resume_doc["id"] if resume_doc else f"res_{uuid.uuid4().hex[:8]}")

    analysis_doc = analysis.model_dump()
    analysis_doc["id"] = analysis_id
    analysis_doc["userId"] = user_id
    analysis_doc["resumeId"] = resolved_resume_id
    analysis_doc["originalFilename"] = resume_doc.get("originalFilename") if resume_doc else "Direct_Input.pdf"
    analysis_doc["filename"] = resume_doc.get("filename") if resume_doc else "Direct_Input.pdf"
    analysis_doc["status"] = "completed"
    analysis_doc["engine"] = getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
    analysis_doc["analyzedAt"] = now_iso
    analysis_doc["createdAt"] = now_iso

    await db.resume_analyses.insert_one(analysis_doc)

    if resume_doc:
        await db.resumes.update_one(
            {"id": resume_doc["id"], "userId": user_id},
            {"$set": {"latestAnalysisId": analysis_id, "atsScore": analysis.atsScore, "updatedAt": now_iso}},
        )

    # Update user profile atsScore
    await db.profiles.update_one({"userId": user_id}, {"$set": {"atsScore": analysis.atsScore}})
    await db.users.update_one(_user_filter(user_id), {"$set": {"atsScore": analysis.atsScore}})

    return ResumeAnalysisResult(
        id=analysis_id,
        userId=user_id,
        resumeId=resolved_resume_id,
        atsScore=analysis.atsScore,
        targetRole=analysis.targetRole,
        targetProfile=analysis.targetRole,
        percentile=analysis.percentile,
        atsBreakdown=analysis.atsBreakdown,
        pillars=analysis.pillars,
        strengths=analysis.strengths,
        weaknesses=analysis.weaknesses,
        optimizationAreas=analysis.optimizationAreas,
        missingKeywords=analysis.missingKeywords,
        keywords=analysis.keywords,
        hardSkills=analysis.hardSkills,
        extractedSkills=analysis.extractedSkills,
        bulletImprovements=analysis.bulletImprovements,
        experienceRewrites=analysis.experienceRewrites,
        projects=analysis.projects,
        education=analysis.education,
        formattingRecommendations=analysis.formattingRecommendations,
        skillGaps=analysis.skillGaps,
        recommendations=analysis.recommendations,
        rawTextSnippet=resume_text[:400] if resume_text else None,
        isAiGenerated=True,
        analyzedAt=now_iso,
        createdAt=now_iso,
    )
