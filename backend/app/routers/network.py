from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.connection_repository import ConnectionRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.connection import (
    ConnectRequestPayload,
    ConnectionActionResponse,
    ConnectionRequestCreate,
    ConnectionRequestResponse,
    ConnectionRespond,
    FollowResponse,
    NetworkSummaryResponse,
    NetworkUser,
)

router = APIRouter(prefix="/network", tags=["Professional Network"])


@router.get("", response_model=NetworkSummaryResponse)
async def get_network_overview(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch overview of authenticated user's network connections and request counts."""
    repo = ConnectionRepository(db)
    return await repo.get_network_summary(user["id"])


@router.get("/discover", response_model=List[NetworkUser])
async def discover_network_users(
    search: Optional[str] = Query(None, description="Search by name, headline, company, or skill"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    skills: Optional[str] = Query(None, description="Filter by skill"),
    company: Optional[str] = Query(None, description="Filter by company"),
    location: Optional[str] = Query(None, description="Filter by location"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Discover real MongoDB users with search, role, skills, and location filters. Strips private fields."""
    repo = ConnectionRepository(db)
    return await repo.get_network_users(
        viewing_user_id=user["id"],
        search=search,
        company=company,
        skills=skills,
        role=role,
        location=location,
        limit=limit,
        skip=skip,
    )


@router.get("/requests", response_model=List[NetworkUser])
async def get_connection_requests(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch incoming pending connection invitations for authenticated user."""
    repo = ConnectionRepository(db)
    return await repo.get_incoming_requests(user["id"])


@router.post("/requests", response_model=ConnectionRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_connection_request(
    payload: ConnectionRequestCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a connection request to a candidate or peer with optional note."""
    target_id = payload.recipientId or payload.userId or payload.receiverId
    if not target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'recipientId' or 'userId' is required.",
        )
    repo = ConnectionRepository(db)
    created = await repo.send_connection_request(user["id"], target_id, payload.note)
    return ConnectionRequestResponse(**created)


@router.post("/requests/{request_id}/accept", response_model=ConnectionRequestResponse)
async def accept_connection_request(
    request_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Accept an incoming connection request (Recipient Only)."""
    repo = ConnectionRepository(db)
    accepted = await repo.accept_connection_request(request_id, user["id"])
    return ConnectionRequestResponse(**accepted)


@router.post("/requests/{request_id}/reject", response_model=ConnectionRequestResponse)
async def reject_connection_request(
    request_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reject an incoming connection request (Recipient Only)."""
    repo = ConnectionRepository(db)
    rejected = await repo.reject_connection_request(request_id, user["id"])
    return ConnectionRequestResponse(**rejected)


@router.delete("/requests/{request_id}", response_model=ConnectionRequestResponse)
async def cancel_connection_request(
    request_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Cancel an outgoing pending connection request (Sender Only)."""
    repo = ConnectionRepository(db)
    cancelled = await repo.cancel_connection_request(request_id, user["id"])
    return ConnectionRequestResponse(**cancelled)


@router.delete("/connections/{user_id}", response_model=StandardSuccessResponse)
async def remove_connection(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Disconnect/remove a 1st-degree connection between authenticated user and target."""
    repo = ConnectionRepository(db)
    removed = await repo.remove_connection(user["id"], user_id)
    return StandardSuccessResponse(
        success=removed,
        message="Connection removed successfully." if removed else "No active connection existed.",
    )


# --- Backward-Compatible Routes ---

@router.get("/users", response_model=List[NetworkUser])
async def get_network_users(
    search: Optional[str] = Query(None, description="Search by name, headline, company, or skill"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    skills: Optional[str] = Query(None, description="Filter by skill"),
    role: Optional[str] = Query(None, description="Filter by role"),
    location: Optional[str] = Query(None, description="Filter by location"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch directory of network engineering users with dynamic relationship state."""
    repo = ConnectionRepository(db)
    return await repo.get_network_users(
        viewing_user_id=user["id"],
        search=search,
        company=company,
        skills=skills,
        role=role,
        location=location,
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
    return await repo.get_suggestions(user["id"], limit=limit)


@router.get("/connections", response_model=List[NetworkUser])
async def get_connections(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch 1st-degree connected engineers for authenticated user."""
    repo = ConnectionRepository(db)
    return await repo.get_connections(user["id"])


@router.post("/users/{user_id}/connect", response_model=ConnectionActionResponse, status_code=status.HTTP_201_CREATED)
async def send_connection_request(
    user_id: str,
    payload: Optional[ConnectRequestPayload] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a connection request to a candidate or peer with optional note."""
    repo = ConnectionRepository(db)
    note = payload.note if payload else None
    created = await repo.send_connection_request(user["id"], user_id, note)
    return ConnectionActionResponse(
        success=True,
        message="Connection request sent successfully.",
        status=created.get("status", "Pending"),
        requestId=created.get("id"),
    )


@router.post("/connect/{user_id}", response_model=ConnectionActionResponse, status_code=status.HTTP_201_CREATED)
async def send_connection_request_legacy(
    user_id: str,
    payload: Optional[ConnectRequestPayload] = None,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Legacy endpoint for sending connection requests."""
    return await send_connection_request(user_id=user_id, payload=payload, user=user, db=db)


@router.post("/requests/{request_id}/respond", response_model=StandardSuccessResponse)
async def respond_to_connection_request(
    request_id: str,
    body: ConnectionRespond,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Accept or ignore an incoming connection request (legacy handler)."""
    repo = ConnectionRepository(db)
    if body.accept:
        await repo.accept_connection_request(request_id, user["id"])
        msg = "Connection accepted."
    else:
        await repo.reject_connection_request(request_id, user["id"])
        msg = "Connection declined."
    return StandardSuccessResponse(success=True, message=msg)


@router.post("/users/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Follow another engineer (Idempotent)."""
    repo = ConnectionRepository(db)
    await repo.follow_user(user["id"], user_id)
    return FollowResponse(following=True)


@router.delete("/users/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unfollow an engineer."""
    repo = ConnectionRepository(db)
    await repo.unfollow_user(user["id"], user_id)
    return FollowResponse(following=False)


@router.post("/follow/{user_id}", response_model=FollowResponse)
async def toggle_follow_legacy(
    user_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggle follow state (legacy client route)."""
    repo = ConnectionRepository(db)
    is_following = await repo.toggle_follow(user["id"], user_id)
    return FollowResponse(following=is_following)
