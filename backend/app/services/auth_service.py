import logging
from typing import Any, Dict, Optional
from fastapi import status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.middleware.error_handler import AppException
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthResponse,
    LoginCredentials,
    RefreshTokenResponse,
    RegisterData,
    UserProfile,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, data: RegisterData) -> AuthResponse:
        email = data.email.strip().lower()
        if data.role == "admin" and not settings.dev_tools_enabled:
            raise AppException(
                message="Administrator accounts cannot be self-registered. Provision admins server-side.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise AppException(
                message="An account with this email address already exists.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        hashed_pw = hash_password(data.password)
        user_doc = await self.user_repo.create({
            "email": email,
            "name": data.name.strip(),
            "passwordHash": hashed_pw,
            "role": data.role,
            "isVerified": False,
            "isActive": True,
        })
        user_id = user_doc["id"]

        # Create corresponding profile document
        initial_skills = (
            ["React", "TypeScript", "Python"]
            if data.role == "seeker"
            else ["Technical Recruiting", "Sourcing", "Interview Coordination"]
        )
        headline = (
            "Software Engineer"
            if data.role == "seeker"
            else "Technical Talent Partner"
        )
        await self.user_repo.create_profile({
            "userId": user_id,
            "name": data.name.strip(),
            "headline": headline,
            "bio": "",
            "location": "Remote",
            "atsScore": 0 if data.role == "seeker" else None,
            "skills": initial_skills,
        })

        if data.role == "seeker":
            try:
                from app.services.dashboard_service import DashboardService
                dash_svc = DashboardService(self.db)
                await dash_svc.ensure_user_dashboard_defaults(user_id, data.name.strip(), email)
            except Exception as e:
                logger.warning("Failed to auto-seed starter data for new user: %s", e)

        token_payload = {
            "sub": user_id,
            "user_id": user_id,
            "email": email,
            "role": data.role,
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        user_profile = UserProfile(
            id=user_id,
            name=data.name.strip(),
            email=email,
            role=data.role,
            avatar=None,
            headline=headline,
            bio="",
            location="Remote",
            atsScore=0 if data.role == "seeker" else None,
            skills=initial_skills,
        )

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            token=access_token,
            user=user_profile,
        )

    async def login(self, credentials: LoginCredentials) -> AuthResponse:
        email = credentials.email.strip().lower()
        user_doc = await self.user_repo.get_by_email(email)

        if not user_doc or not verify_password(credentials.password, user_doc.get("passwordHash", "")):
            raise AppException(
                message="Invalid email or password. Please verify your credentials.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if not user_doc.get("isActive", True):
            raise AppException(
                message="Your account has been deactivated. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        user_id = user_doc["id"]
        role = user_doc.get("role", "seeker")

        token_payload = {
            "sub": user_id,
            "user_id": user_id,
            "email": email,
            "role": role,
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # Retrieve profile details
        profile = await self.user_repo.get_profile(user_id)
        name = profile.get("name") if profile else email.split("@")[0].capitalize()
        real_ats_score = await self._resolve_ats_score(user_id, profile)

        user_profile = UserProfile(
            id=user_id,
            name=name,
            email=email,
            role=role,
            company=(profile and profile.get("company")) or user_doc.get("company"),
            avatar=profile.get("avatarUrl") or profile.get("avatar") if profile else None,
            headline=profile.get("headline") if profile else None,
            bio=profile.get("bio") if profile else None,
            location=profile.get("location", "Remote") if profile else "Remote",
            atsScore=real_ats_score,
            skills=profile.get("skills", []) if profile else [],
        )

        if role == "seeker":
            try:
                from app.services.dashboard_service import DashboardService
                dash_svc = DashboardService(self.db)
                await dash_svc.ensure_user_dashboard_defaults(user_id, name, email)
            except Exception:
                pass

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            token=access_token,
            user=user_profile,
        )

    async def refresh_session(self, token_str: str) -> RefreshTokenResponse:
        payload = decode_token(token_str)
        if not payload:
            raise AppException(
                message="Session expired or invalid refresh token.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if payload.get("token_type") != "refresh":
            raise AppException(
                message="Invalid token type. Refresh token expected.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        # A logout revokes the whole session: reject explicitly revoked
        # tokens and any token minted before the user's last logout.
        revoked = await self.db.revoked_tokens.find_one({"token": token_str})
        if revoked:
            raise AppException(
                message="Session has been logged out. Please sign in again.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        user_id = payload.get("sub") or payload.get("user_id")
        user_doc = await self.user_repo.get_by_id(user_id) if user_id else None
        if not user_doc or not user_doc.get("isActive", True):
            raise AppException(
                message="User account no longer active or valid.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if user_doc.get("lastLogoutAt") and payload.get("iat"):
            if payload["iat"] < user_doc["lastLogoutAt"]:
                raise AppException(
                    message="Session has expired due to logout. Please sign in again.",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )

        token_payload = {
            "sub": user_id,
            "user_id": user_id,
            "email": user_doc.get("email"),
            "role": user_doc.get("role", "seeker"),
        }
        new_access = create_access_token(token_payload)
        new_refresh = create_refresh_token(token_payload)

        return RefreshTokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            token_type="bearer",
            token=new_access,
        )

    async def _resolve_ats_score(self, user_id: str, profile: Optional[Dict[str, Any]]) -> Optional[int]:
        """Resolve actual ATS score from latest completed resume analysis."""
        latest_analysis = await self.db.resume_analyses.find_one(
            {"userId": user_id},
            sort=[("createdAt", -1)],
        )
        if latest_analysis:
            if "analysis" in latest_analysis and isinstance(latest_analysis["analysis"], dict) and "atsScore" in latest_analysis["analysis"]:
                return int(latest_analysis["analysis"]["atsScore"])
            elif "atsScore" in latest_analysis and latest_analysis["atsScore"] is not None:
                return int(latest_analysis["atsScore"])

        res_doc = await self.db.resumes.find_one(
            {"userId": user_id, "atsScore": {"$exists": True, "$ne": None, "$gt": 0}},
            sort=[("updatedAt", -1), ("createdAt", -1)],
        )
        if res_doc and res_doc.get("atsScore") is not None:
            return int(res_doc["atsScore"])

        return 0

    async def get_user_profile(self, user_id: str) -> UserProfile:
        user_doc = await self.user_repo.get_by_id(user_id)
        if not user_doc:
            raise AppException(
                message="User account not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        profile = await self.user_repo.get_profile(user_id)
        email = user_doc["email"]
        name = profile.get("name") if profile else email.split("@")[0].capitalize()
        real_ats_score = await self._resolve_ats_score(user_id, profile)

        return UserProfile(
            id=user_id,
            name=name,
            email=email,
            role=user_doc.get("role", "seeker"),
            company=(profile and profile.get("company")) or user_doc.get("company"),
            avatar=profile.get("avatarUrl") or profile.get("avatar") if profile else None,
            headline=profile.get("headline") if profile else None,
            bio=profile.get("bio") if profile else None,
            location=profile.get("location", "Remote") if profile else "Remote",
            atsScore=real_ats_score,
            skills=profile.get("skills", []) if profile else [],
        )
