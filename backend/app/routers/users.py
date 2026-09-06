from pathlib import Path
from typing import Any, Dict
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.file_repository import FileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserProfile
from app.schemas.user import AvatarUploadResponse, ProfilePrivacySettings, UserProfileUpdate
from app.services.auth_service import AuthService
from app.storage import get_storage_backend
from app.utils.file_validation import validate_file_content

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve profile of authenticated user."""
    auth_service = AuthService(db)
    return await auth_service.get_user_profile(current_user["id"])


@router.get("/{user_id}", response_model=UserProfile)
async def get_profile_by_id(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve profile of specified user ID."""
    auth_service = AuthService(db)
    return await auth_service.get_user_profile(user_id)


@router.patch("/me", response_model=UserProfile)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update profile attributes."""
    user_repo = UserRepository(db)
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    await user_repo.update_profile(current_user["id"], update_dict)
    auth_service = AuthService(db)
    return await auth_service.get_user_profile(current_user["id"])


@router.put("/me/privacy")
async def update_privacy_settings(
    settings_data: ProfilePrivacySettings,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update user privacy and visibility directives."""
    user_repo = UserRepository(db)
    await user_repo.update_profile(current_user["id"], {"privacy": settings_data.model_dump()})
    return {"success": True, "settings": settings_data.model_dump()}


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    avatar_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload, validate, and store profile avatar photo."""
    if not avatar_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An image file is required.",
        )

    content = await avatar_file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar image size cannot exceed 5MB.",
        )

    sanitized_filename, validated_content_type = validate_file_content(
        filename=avatar_file.filename or "avatar.jpg",
        content=content,
        claimed_content_type=avatar_file.content_type,
    )

    if not validated_content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{validated_content_type}'. Avatar must be an image (JPEG, PNG, WebP).",
        )

    ext = Path(sanitized_filename).suffix.lower() or ".jpg"
    storage_key = f"{current_user['id']}/avatar_{uuid.uuid4().hex}{ext}"

    storage = get_storage_backend()
    await storage.save(storage_key, content, validated_content_type)

    repo = FileRepository(db)
    meta = await repo.create_file_metadata(
        owner_id=current_user["id"],
        original_filename=sanitized_filename,
        content_type=validated_content_type,
        size=len(content),
        storage_key=storage_key,
        purpose="profile_avatar",
    )

    avatar_url = f"/api/files/{meta['id']}"

    user_repo = UserRepository(db)
    await user_repo.update_profile(current_user["id"], {"avatarUrl": avatar_url, "avatar": avatar_url})
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"avatar": avatar_url, "avatarUrl": avatar_url}})

    return AvatarUploadResponse(avatarUrl=avatar_url)
