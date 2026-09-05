from typing import Any, Dict
from fastapi import APIRouter, Depends, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserProfile
from app.schemas.user import AvatarUploadResponse, ProfilePrivacySettings, UserProfileUpdate
from app.services.auth_service import AuthService

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
    avatar_file: UploadFile = File(None),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload or update profile avatar photo."""
    # Production file storage simulation or cloud bucket URL
    avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    user_repo = UserRepository(db)
    await user_repo.update_profile(current_user["id"], {"avatarUrl": avatar_url, "avatar": avatar_url})
    return AvatarUploadResponse(avatarUrl=avatar_url)
