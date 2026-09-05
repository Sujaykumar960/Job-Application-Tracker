from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.notification_repository import NotificationRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.notification import (
    CareerNotification,
    NotificationCreate,
    NotificationFilterQuery,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[CareerNotification])
async def get_notifications(
    response: Response,
    category: Optional[str] = Query(None, description="Filter by notification category"),
    isRead: Optional[bool] = Query(None, description="Filter by read/unread state"),
    priority: Optional[str] = Query(None, description="Filter by priority: urgent, normal, low"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    page: Optional[int] = Query(None, ge=1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch user notifications with category, read status, and priority filters."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    filter_q = NotificationFilterQuery(
        category=category,
        isRead=isRead,
        priority=priority,
        limit=limit,
        skip=skip,
        page=page,
    )
    docs = await repo.get_user_notifications(user_id, filter_q)
    unread_count = await repo.get_unread_count(user_id)
    response.headers["X-Unread-Count"] = str(unread_count)
    return docs


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch count of unread notifications for authenticated user."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    count = await repo.get_unread_count(user_id)
    return UnreadCountResponse(unreadCount=count, count=count)


@router.get("/{notification_id}", response_model=CareerNotification)
async def get_notification_by_id(
    notification_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch individual notification strictly owned by authenticated user."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    doc = await repo.get_notification_by_id(notification_id, user_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID '{notification_id}' not found.",
        )
    return doc


@router.post("", response_model=CareerNotification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new notification bound to user."""
    repo = NotificationRepository(db)
    doc_data = data.model_dump()
    doc_data["userId"] = user["id"] if user else "usr_guest"
    return await repo.create_deduped_notification(doc_data, dedup_key=data.dedupKey)


@router.patch("/{notification_id}/read", response_model=StandardSuccessResponse)
@router.post("/{notification_id}/read", response_model=StandardSuccessResponse)
async def mark_notification_as_read(
    notification_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Mark an individual notification as read (strictly owned by user)."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    updated = await repo.mark_as_read(notification_id, user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID '{notification_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Notification marked as read.")


@router.post("/read-all", response_model=StandardSuccessResponse)
async def mark_all_notifications_as_read(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Mark all notifications as read for authenticated user."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    modified = await repo.mark_all_read(user_id)
    return StandardSuccessResponse(
        success=True,
        message=f"Marked {modified} notifications as read.",
    )


@router.delete("/{notification_id}", response_model=StandardSuccessResponse)
async def delete_notification(
    notification_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a single notification strictly owned by user."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    deleted = await repo.delete_notification(notification_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID '{notification_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Notification deleted.")


@router.post("/clear-read", response_model=StandardSuccessResponse)
async def clear_read_notifications(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Clear all read notifications for user."""
    repo = NotificationRepository(db)
    user_id = user["id"] if user else "usr_guest"
    count = await repo.clear_read(user_id)
    return StandardSuccessResponse(success=True, message=f"Cleared {count} read notifications.")
