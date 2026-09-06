import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginCredentials,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegisterData,
    ResetPasswordRequest,
    SwitchRoleRequest,
    UserProfile,
)
from app.middleware.rate_limiter import auth_rate_limiter
from app.schemas.common import StandardSuccessResponse
from app.services.auth_service import AuthService
from app.utils.helpers import utc_now_iso
from app.utils.security import hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limiter)],
)
async def register(
    data: RegisterData,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Register a new candidate or recruiter account with email, password, and role."""
    auth_service = AuthService(db)
    return await auth_service.register(data)


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(auth_rate_limiter)])
async def login(
    credentials: LoginCredentials,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate user with email and password, returning JWT access/refresh tokens and profile."""
    auth_service = AuthService(db)
    return await auth_service.login(credentials)


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve profile of the currently authenticated user."""
    auth_service = AuthService(db)
    return await auth_service.get_user_profile(current_user["id"])


@router.post("/logout", response_model=StandardSuccessResponse)
async def logout(
    authorization: Optional[str] = Header(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Logout current session and revoke access token."""
    now_ts = int(datetime.now(timezone.utc).timestamp())
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()

    if token:
        await db.revoked_tokens.update_one(
            {"token": token},
            {"$set": {"token": token, "revokedAt": utc_now_iso(), "expiresAt": now_ts + 86400}},
            upsert=True,
        )

    if user and "_id" in user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"lastLogoutAt": now_ts}},
        )

    return StandardSuccessResponse(success=True, message="Successfully logged out.")


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    body: Optional[RefreshTokenRequest] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Refresh JWT access token using either refresh token in request body or Authorization header."""
    token = None
    if body and body.refresh_token:
        token = body.refresh_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required in request body or Authorization header.",
        )

    auth_service = AuthService(db)
    return await auth_service.refresh_session(token)


@router.post("/forgot-password", response_model=StandardSuccessResponse, dependencies=[Depends(auth_rate_limiter)])
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Dispatch password reset token (simulated for development or integrated with SMTP)."""
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user:
        # Prevent email enumeration: return success regardless
        return StandardSuccessResponse(
            success=True,
            message="If an account with this email exists, a password reset link has been dispatched.",
        )

    reset_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "resetTokenHash": token_hash,
                "resetTokenExpiresAt": expires_at,
            },
            "$unset": {"resetToken": ""},
        },
    )

    return StandardSuccessResponse(
        success=True,
        message="If an account with this email exists, a password reset link has been dispatched.",
    )


@router.post("/reset-password", response_model=StandardSuccessResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reset password using provided token."""
    # Hash the supplied secret so the database never stores the reset token itself.
    token = body.token.strip()
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    user = await db.users.find_one_and_update(
        {
            "resetTokenHash": token_hash,
            "resetTokenExpiresAt": {"$gt": now},
        },
        {
            "$unset": {
                "resetTokenHash": "",
                "resetTokenExpiresAt": "",
            },
        },
        return_document=ReturnDocument.AFTER,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    new_hash = hash_password(body.password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": new_hash}},
    )

    return StandardSuccessResponse(
        success=True,
        message="Your password has been successfully updated. You may now log in.",
    )


@router.post("/switch-role", response_model=AuthResponse)
async def switch_role(
    body: SwitchRoleRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Authoritatively switch role between 'seeker' and 'recruiter' in MongoDB,
    and issue a new authenticated JWT with updated role claims.
    """
    new_role = body.role.strip().lower()
    if new_role not in ["seeker", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'seeker' or 'recruiter'.",
        )

    auth_service = AuthService(db)
    return await auth_service.switch_role(current_user["id"], new_role)
