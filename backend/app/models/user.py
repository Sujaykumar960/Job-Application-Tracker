from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

from app.utils.helpers import utc_now_iso

UserRole = Literal["seeker", "recruiter", "admin"]


class UserModel(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    passwordHash: str
    role: UserRole = "seeker"
    isVerified: bool = False
    isActive: bool = True
    profileId: Optional[str] = None
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
