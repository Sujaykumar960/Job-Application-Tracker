from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.auth import UserProfile, UserRole


class ProfilePrivacySettings(BaseModel):
    profileVisibility: Literal["public", "members", "private"] = "public"
    resumeVisibility: Literal["all_recruiters", "applied_only", "private"] = "all_recruiters"
    careerProgressVisibility: Literal["public_showcase", "recruiters_only", "private"] = "public_showcase"
    applicationPrivacy: bool = True
    jobSearchStatus: Literal["actively_looking", "casually_browsing", "not_looking"] = "actively_looking"
    showSalary: bool = True
    salaryExpectation: Optional[str] = None
    cloakCurrentEmployer: bool = False
    currentEmployerDomain: Optional[str] = None
    contactVisibility: Literal["all_recruiters", "mutual_matches", "hidden"] = "all_recruiters"


class UserProfileCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = "seeker"
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = "Remote"
    skills: List[str] = Field(default_factory=list)
    avatar: Optional[str] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar: Optional[str] = None
    atsScore: Optional[int] = None


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    company: Optional[str] = None
    avatar: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    atsScore: Optional[int] = None
    skills: List[str] = Field(default_factory=list)
    privacy: Optional[ProfilePrivacySettings] = None


class UserFilterQuery(BaseModel):
    search: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    skill: Optional[str] = None
    limit: int = 50
    skip: int = 0


class PrivacySettingsUpdate(ProfilePrivacySettings):
    pass


class AvatarUploadResponse(BaseModel):
    avatarUrl: str


class PublicUserProfileResponse(BaseModel):
    id: str
    name: str
    role: Optional[str] = "seeker"
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    avatarUrl: Optional[str] = None
    avatarInitials: Optional[str] = None
    avatarGradient: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experiences: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    websiteUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    linkedinUrl: Optional[str] = None
    connectionStatus: Optional[str] = "none"
    requestId: Optional[str] = None
    createdAt: Optional[str] = None
