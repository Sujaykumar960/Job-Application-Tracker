from pathlib import Path
import re
from typing import Any, Dict, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.repositories.file_repository import FileRepository
from app.schemas.file import FileDeleteResponse, FileMetadataResponse
from app.storage import get_storage_backend
from app.utils.file_validation import validate_file_content
from app.utils.privacy import is_candidate_cloaked_from_recruiter

router = APIRouter(prefix="/files", tags=["File Storage & Attachments"])


@router.post("/upload", response_model=FileMetadataResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    purpose: str = Form("other"),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Securely upload a file, validate magic bytes, and persist to storage abstraction."""
    valid_purposes = {"resume", "chat_attachment", "profile_avatar", "other"}
    if purpose not in valid_purposes:
        purpose = "other"

    content = await file.read()
    sanitized_filename, validated_content_type = validate_file_content(
        filename=file.filename or "uploaded_file.bin",
        content=content,
        claimed_content_type=file.content_type,
    )

    # Generate secure non-guessable storage key
    ext = Path(sanitized_filename).suffix.lower()
    storage_key = f"{user['id']}/{uuid.uuid4().hex}{ext}"

    # Persist bytes using storage abstraction
    storage = get_storage_backend()
    await storage.save(storage_key, content, validated_content_type)

    # Persist metadata to MongoDB
    repo = FileRepository(db)
    meta = await repo.create_file_metadata(
        owner_id=user["id"],
        original_filename=sanitized_filename,
        content_type=validated_content_type,
        size=len(content),
        storage_key=storage_key,
        purpose=purpose,
    )

    return FileMetadataResponse(
        id=meta["id"],
        ownerId=meta["ownerId"],
        originalFilename=meta["originalFilename"],
        contentType=meta["contentType"],
        size=meta["size"],
        storageKey=meta["storageKey"],
        createdAt=meta["createdAt"],
        purpose=meta["purpose"],
        downloadUrl=f"/api/files/{meta['id']}",
    )


@router.get("/{file_id}")
async def download_file(
    file_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Download/stream a file with strict multi-tenant authorization checks."""
    repo = FileRepository(db)
    meta = await repo.get_by_id(file_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found.",
        )

    # 1. Authorization checks
    is_owner = meta["ownerId"] == user["id"]
    is_admin = user.get("role") == "admin"
    is_authorized = is_owner or is_admin

    if not is_authorized and meta.get("purpose") == "resume" and user.get("role") == "recruiter":
        owner_profile = await db.profiles.find_one({"userId": meta["ownerId"]})
        privacy = (owner_profile or {}).get("privacy", {})

        # 1. Candidate must not be 'not_looking'
        if privacy.get("searchStatus") != "not_looking":
            recruiter_company = user.get("company")
            if not recruiter_company:
                recruiter_profile = await db.profiles.find_one({"userId": user["id"]})
                recruiter_company = (recruiter_profile or {}).get("company")

            # 2. Candidate must not be cloaked from this recruiter's company
            if not is_candidate_cloaked_from_recruiter(privacy, recruiter_company):
                contact_visibility = privacy.get("contactVisibility", "hidden")
                resume_visibility = privacy.get("resumeVisibility", "private")

                if contact_visibility == "all_recruiters" or resume_visibility == "all_recruiters":
                    is_authorized = True
                elif contact_visibility == "mutual_matches" or resume_visibility == "applied_only":
                    if recruiter_company:
                        company_pattern = re.escape(recruiter_company.strip())
                        application = await db.applications.find_one(
                            {
                                "userId": meta["ownerId"],
                                "$or": [
                                    {"company": {"$regex": f"^{company_pattern}$", "$options": "i"}},
                                    {"companyName": {"$regex": f"^{company_pattern}$", "$options": "i"}},
                                ],
                            }
                        )
                        is_authorized = application is not None

    if not is_authorized and meta.get("purpose") == "chat_attachment":
        # Check if user is a participant in a conversation referencing this file
        conv = await db.conversations.find_one({
            "participants": user["id"],
            "messages.attachment.url": {"$regex": re.escape(file_id)},
        })
        if conv:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permission to view or download this private file.",
        )

    # 2. Retrieve stream from storage backend
    storage = get_storage_backend()
    if not await storage.exists(meta["storageKey"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage repository.",
        )

    return StreamingResponse(
        storage.get_stream(meta["storageKey"]),
        media_type=meta["contentType"],
        headers={
            "Content-Disposition": f'inline; filename="{meta["originalFilename"]}"',
            "Content-Length": str(meta["size"]),
        },
    )


@router.delete("/{file_id}", response_model=FileDeleteResponse)
async def delete_file(
    file_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a file from storage and database. Only the owner or admin may delete."""
    repo = FileRepository(db)
    meta = await repo.get_by_id(file_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID '{file_id}' not found.",
        )

    is_owner = meta["ownerId"] == user["id"]
    is_admin = user.get("role") == "admin"

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only the file owner may delete this file.",
        )

    # 1. Delete physical file from storage backend
    storage = get_storage_backend()
    await storage.delete(meta["storageKey"])

    # 2. Delete metadata document from MongoDB
    await repo.delete(file_id)

    return FileDeleteResponse(
        success=True,
        message="File deleted successfully.",
        fileId=file_id,
    )
