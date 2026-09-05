from typing import Any, Callable, Dict, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.repositories.user_repository import UserRepository
from app.utils.security import decode_token

security_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency for accessing the MongoDB database."""
    return get_database()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Validate Bearer JWT access token and retrieve authenticated user from MongoDB."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate token type (reject refresh tokens used as bearer access tokens)
    token_type = payload.get("token_type")
    if token_type and token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token expected.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token has been revoked in token blocklist
    revoked = await db.revoked_tokens.find_one({"token": token})
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been logged out. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload structure.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token was issued prior to user's last logout
    if user.get("lastLogoutAt") and payload.get("iat"):
        if payload["iat"] < user["lastLogoutAt"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired due to logout. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact support.",
        )

    return user


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Dependency ensuring user is authenticated and active."""
    if not current_user.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    """Extract authenticated user if token is provided, otherwise return None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload:
            revoked = await db.revoked_tokens.find_one({"token": credentials.credentials})
            if revoked:
                return None
            user_id = payload.get("sub") or payload.get("user_id")
            if user_id:
                user_repo = UserRepository(db)
                user = await user_repo.get_by_id(user_id)
                if user and user.get("lastLogoutAt") and payload.get("iat"):
                    if payload["iat"] < user["lastLogoutAt"]:
                        return None
                return user
    except Exception:
        pass
    return None


def require_role(*allowed_roles: str) -> Callable:
    """Dependency factory enforcing strict role-based access control."""
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_active_user),
    ) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {list(allowed_roles)}, your role: '{user_role}'.",
            )
        return current_user

    return role_checker


# Alias for backward compatibility
require_roles = require_role
