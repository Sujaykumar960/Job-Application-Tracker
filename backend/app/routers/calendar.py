from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.calendar_repository import CalendarRepository
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
    GoogleCalendarSyncResult,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/calendar", tags=["Calendar Sync & Events"])


@router.get("/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(
    start_date: Optional[str] = Query(None, description="Filter from start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Filter to end date YYYY-MM-DD"),
    event_type: Optional[str] = Query(None, alias="type", description="Filter by event type"),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch all calendar events where the user is an owner or participant."""
    repo = CalendarRepository(db)
    docs = await repo.get_user_events(
        user_id=user["id"],
        start_date=start_date,
        end_date=end_date,
        event_type=event_type,
    )
    return [CalendarEventResponse(**d) for d in docs]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    event_data: CalendarEventCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new schedule or interview milestone event owned by current user."""
    repo = CalendarRepository(db)
    doc = await repo.create_event(user["id"], event_data.model_dump())

    # Generate a real notification for the scheduled event
    try:
        await NotificationService.notify_calendar_event(
            db=db,
            user_id=user["id"],
            title=doc.get("title", "Event"),
            date=doc.get("date", ""),
            time=doc.get("time", ""),
            event_id=doc["id"],
            company=doc.get("company"),
        )
    except Exception:
        pass

    return CalendarEventResponse(**doc)


@router.get("/events/{event_id}", response_model=CalendarEventResponse)
async def get_calendar_event(
    event_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single event by ID if user is owner or participant."""
    repo = CalendarRepository(db)
    doc = await repo.get_event_by_id(event_id, user["id"])
    if doc:
        return CalendarEventResponse(**doc)

    raw = await repo.get_raw_event(event_id)
    if raw:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this event.",
        )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Calendar event not found.",
    )


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    event_id: str,
    update_data: CalendarEventUpdate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing calendar event (restricted to owner)."""
    repo = CalendarRepository(db)
    try:
        updated = await repo.update_event(
            event_id=event_id,
            user_id=user["id"],
            update_data=update_data.model_dump(exclude_unset=True),
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found.",
        )
    return CalendarEventResponse(**updated)


@router.delete("/events/{event_id}", status_code=status.HTTP_200_OK)
async def delete_calendar_event(
    event_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete an existing calendar event (restricted to owner)."""
    repo = CalendarRepository(db)
    try:
        deleted = await repo.delete_event(event_id=event_id, user_id=user["id"])
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calendar event not found.",
        )
    return {"success": True, "message": "Event deleted successfully."}


@router.post("/google/sync", response_model=GoogleCalendarSyncResult)
async def sync_google_calendar(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Sync user's real events with Google Calendar."""
    repo = CalendarRepository(db)
    count = await repo.count_user_events(user["id"])
    await repo.sync_all_user_events(user["id"])

    now_str = datetime.now(timezone.utc).strftime("Today %I:%M %p")
    user_email = user.get("email", "")

    return GoogleCalendarSyncResult(
        success=True,
        syncedCount=count,
        lastSyncedAt=now_str,
        accountEmail=user_email,
    )