from typing import Any, Dict, Optional
from fastapi import status
from motor.motor_asyncio import AsyncIOMotorDatabase

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


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.user_repo = UserRepository(db)

    async def register(self, data: RegisterData) -> AuthResponse:
        email = data.email.strip().lower()
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise AppException(
                message="An account with this email address already exists.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        hashed_pw = hash_password(data.password)
        user_doc = await self.user_repo.create({
            "email": email,
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
            "atsScore": 80 if data.role == "seeker" else None,
            "skills": initial_skills,
        })

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
            atsScore=80 if data.role == "seeker" else None,
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

        if not user_doc:
            raise AppException(
                message="Invalid email or password. Please check your credentials.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if not verify_password(credentials.password, user_doc.get("passwordHash", "")):
            raise AppException(
                message="Invalid password. Please check your credentials and try again.",
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
            atsScore=profile.get("atsScore") if profile else None,
            skills=profile.get("skills", []) if profile else [],
        )

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

        user_id = payload.get("sub") or payload.get("user_id")
        user_doc = await self.user_repo.get_by_id(user_id) if user_id else None
        if not user_doc or not user_doc.get("isActive", True):
            raise AppException(
                message="User account no longer active or valid.",
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
            atsScore=profile.get("atsScore") if profile else None,
            skills=profile.get("skills", []) if profile else [],
        )

    async def switch_role(self, user_id: str, new_role: str) -> AuthResponse:
        user_doc = await self.user_repo.get_by_id(user_id)
        if not user_doc:
            raise AppException(
                message="User account not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Authoritatively update user role in users and profiles collections
        await self.user_repo.update(user_id, {"role": new_role})
        await self.user_repo.update_profile(user_id, {"role": new_role})

        email = user_doc["email"]
        token_payload = {
            "sub": user_id,
            "user_id": user_id,
            "email": email,
            "role": new_role,
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        profile = await self.user_repo.get_profile(user_id)
        name = profile.get("name") if profile else email.split("@")[0].capitalize()

        user_profile = UserProfile(
            id=user_id,
            name=name,
            email=email,
            role=new_role,
            company=(profile and profile.get("company")) or user_doc.get("company"),
            avatar=profile.get("avatarUrl") or profile.get("avatar") if profile else None,
            headline=profile.get("headline") if profile else None,
            bio=profile.get("bio") if profile else None,
            location=profile.get("location", "Remote") if profile else "Remote",
            atsScore=profile.get("atsScore") if profile else None,
            skills=profile.get("skills", []) if profile else [],
        )

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            token=access_token,
            user=user_profile,
        )
