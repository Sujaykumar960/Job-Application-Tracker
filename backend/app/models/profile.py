from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.user import ProfilePrivacySettings
from app.utils.helpers import utc_now_iso


class ProfileModel(BaseModel):
    id: Optional[str] = None
    userId: str
    name: str
    email: Optional[str] = None
    role: str = "seeker"
    headline: str = ""
    bio: Optional[str] = ""
    location: Optional[str] = "Remote"
    avatar: Optional[str] = None
    avatarUrl: Optional[str] = None
    avatarInitials: Optional[str] = None
    avatarGradient: Optional[str] = None
    atsScore: Optional[int] = 75
    skills: List[str] = Field(default_factory=list)
    phone: Optional[str] = None
    websiteUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    linkedinUrl: Optional[str] = None
    privacy: ProfilePrivacySettings = Field(default_factory=ProfilePrivacySettings)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
