from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.connection_repository import ConnectionRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.connection import (
    ConnectRequestPayload,
    ConnectionActionResponse,
    ConnectionRespond,
    FollowResponse,
    NetworkUser,
)

router = APIRouter(prefix="/network", tags=["Professional Network"])


@router.get("/users", response_model=List[NetworkUser])
async def get_network_users(
    search: Optional[str] = Query(None, description="Search by name, headline, company, or skill"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    skills: Optional[str] = Query(None, description="Filter by skill"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch directory of network engineering users with dynamic relationship state."""
    repo = ConnectionRepository(db)
    viewing_uid = user["id"] if user else None
    return await repo.get_network_users(
        viewing_user_id=viewing_uid,
        search=search,
        company=company,
        skills=skills,
        limit=limit,
        skip=skip,
    )


@router.get("/suggestions", response_model=List[NetworkUser])
async def get_suggested_connections(
    limit: int = Query(20, ge=1, le=50),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch recommended candidate & engineering peers ranked by shared skills, company, and mutuals."""
    repo = ConnectionRepository(db)
    user_id = user["id"]
    return await repo.get_suggestions(user_id, limit=limit)


@router.get("/connections", response_model=List[NetworkUser])
async def get_connections(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch 1st-degree connected engineers for authenticated user."""
    repo = ConnectionRepository(db)
    user_id = user["id"]
    return await repo.get_connections(user_id)


@router.get("/requests", response_model=List[NetworkUser])
async def get_connection_requests(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch incoming connection invitations for authenticated user."""
    repo = ConnectionRepository(db)
    user_id = user["id"]
    return await repo.get_incoming_requests(user_id)


@router.post("/users/{user_id}/connect", response_model=ConnectionActionResponse, status_code=status.HTTP_201_CREATED)
async def send_connection_request(
    user_id: str,
    payload: Optional[ConnectRequestPayload] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a connection request to a candidate or peer with optional note."""
    repo = ConnectionRepository(db)
    requester_id = user["id"]
    note = payload.note if payload else None
    created = await repo.send_connection_request(requester_id, user_id, note)
    return ConnectionActionResponse(
        success=True,
        message="Connection request sent successfully.",
        status=created.get("status", "Pending"),
        requestId=created.get("id"),
    )


# Backward-compatible route for frontend client (connectionApi.ts)
@router.post("/connect/{user_id}", response_model=ConnectionActionResponse, status_code=status.HTTP_201_CREATED)
async def send_connection_request_legacy(
    user_id: str,
    payload: Optional[ConnectRequestPayload] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Legacy endpoint for sending connection requests."""
    return await send_connection_request(user_id=user_id, payload=payload, user=user, db=db)


@router.post("/requests/{request_id}/accept", response_model=ConnectionActionResponse)
async def accept_connection_request(
    request_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Accept an incoming connection request (Recipient Only)."""
    repo = ConnectionRepository(db)
    receiver_id = user["id"]
    accepted = await repo.accept_connection_request(request_id, receiver_id)
    return ConnectionActionResponse(
        success=True,
        message="Connection request accepted.",
        status="Connected",
        requestId=accepted.get("id", request_id),
    )


@router.post("/requests/{request_id}/reject", response_model=ConnectionActionResponse)
async def reject_connection_request(
    request_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reject an incoming connection request (Recipient Only)."""
    repo = ConnectionRepository(db)
    receiver_id = user["id"]
    rejected = await repo.reject_connection_request(request_id, receiver_id)
    return ConnectionActionResponse(
        success=True,
        message="Connection request declined.",
        status="Declined",
        requestId=rejected.get("id", request_id),
    )


# Backward-compatible route for frontend client (connectionApi.ts)
@router.post("/requests/{request_id}/respond", response_model=StandardSuccessResponse)
async def respond_to_connection_request(
    request_id: str,
    body: ConnectionRespond,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Accept or ignore an incoming connection request (legacy handler)."""
    repo = ConnectionRepository(db)
    receiver_id = user["id"]
    if body.accept:
        await repo.accept_connection_request(request_id, receiver_id)
        msg = "Connection accepted."
    else:
        await repo.reject_connection_request(request_id, receiver_id)
        msg = "Connection declined."
    return StandardSuccessResponse(success=True, message=msg)


@router.delete("/connections/{user_id}", response_model=StandardSuccessResponse)
async def remove_connection(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Disconnect/remove a 1st-degree connection with another engineer."""
    repo = ConnectionRepository(db)
    current_uid = user["id"]
    removed = await repo.remove_connection(current_uid, user_id)
    return StandardSuccessResponse(
        success=removed,
        message="Connection removed successfully." if removed else "No active connection existed.",
    )


@router.post("/users/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Follow another engineer (Idempotent)."""
    repo = ConnectionRepository(db)
    follower_id = user["id"]
    await repo.follow_user(follower_id, user_id)
    return FollowResponse(following=True)


@router.delete("/users/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unfollow an engineer."""
    repo = ConnectionRepository(db)
    follower_id = user["id"]
    await repo.unfollow_user(follower_id, user_id)
    return FollowResponse(following=False)


# Backward-compatible toggle route for frontend client (connectionApi.ts)
@router.post("/follow/{user_id}", response_model=FollowResponse)
async def toggle_follow_legacy(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggle follow state (legacy client route)."""
    repo = ConnectionRepository(db)
    follower_id = user["id"]
    is_following = await repo.toggle_follow(follower_id, user_id)
    return FollowResponse(following=is_following)
