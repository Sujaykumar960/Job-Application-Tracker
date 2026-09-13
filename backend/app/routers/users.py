from pathlib import Path
from typing import Any, Dict, Optional
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.file_repository import FileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserProfile
from app.schemas.user import AvatarUploadResponse, ProfilePrivacySettings, PublicUserProfileResponse, UserProfileUpdate
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
    """Upload or update profile avatar photo using storage backend."""
    content = await avatar_file.read()
    sanitized_filename, validated_content_type = validate_file_content(
        filename=avatar_file.filename or "avatar.png",
        content=content,
        claimed_content_type=avatar_file.content_type,
        max_size_bytes=settings.FEED_MAX_IMAGE_SIZE_BYTES,
    )

    ext = Path(sanitized_filename).suffix.lower()
    storage_key = f"avatars/{current_user['id']}/{uuid.uuid4().hex}{ext}"

    storage = get_storage_backend()
    await storage.save(storage_key, content, validated_content_type)

    file_repo = FileRepository(db)
    meta = await file_repo.create_file_metadata(
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
    return AvatarUploadResponse(avatarUrl=avatar_url)


@router.get("/{user_id}/profile", response_model=PublicUserProfileResponse)
async def get_public_user_profile(
    user_id: str,
    viewing_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve sanitized public profile with dynamic relationship status (LinkedIn-style)."""
    user_repo = UserRepository(db)
    viewing_uid = viewing_user["id"] if viewing_user else None
    profile = await user_repo.get_public_profile(user_id, viewing_user_id=viewing_uid)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )
    return profile


@router.get("/{user_id}", response_model=UserProfile)
async def get_profile_by_id(
    user_id: str,
    viewing_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve profile of specified user ID, masking sensitive fields for third parties or unauthenticated callers."""
    auth_service = AuthService(db)
    profile = await auth_service.get_user_profile(user_id)
    is_owner = viewing_user and viewing_user.get("id") == user_id
    is_admin = viewing_user and viewing_user.get("role") == "admin"
    if not (is_owner or is_admin):
        if profile.email and "@" in profile.email:
            parts = profile.email.split("@")
            masked_name = parts[0][:2] + "***"
            profile.email = f"{masked_name}@{parts[1]}"
        profile.atsScore = None
    return profile
