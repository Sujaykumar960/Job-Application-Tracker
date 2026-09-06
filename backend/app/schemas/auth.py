from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator

UserRole = Literal["seeker", "recruiter", "admin"]


class UserProfile(BaseModel):
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


class LoginCredentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="Account password")


class RegisterData(BaseModel):
    name: str = Field(..., min_length=1, description="Full name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    role: UserRole = "seeker"


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    token: Optional[str] = None
    user: UserProfile

    @model_validator(mode="after")
    def populate_token_alias(self) -> "AuthResponse":
        if not self.token:
            self.token = self.access_token
        return self


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    token: Optional[str] = None

    @model_validator(mode="after")
    def populate_token_alias(self) -> "RefreshTokenResponse":
        if not self.token:
            self.token = self.access_token
        return self


class TokenPayload(BaseModel):
    sub: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: str
    token_type: Optional[str] = "access"
    exp: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, description="New password")


class SwitchRoleRequest(BaseModel):
    role: UserRole
