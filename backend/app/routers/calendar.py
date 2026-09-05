import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    GoogleCalendarSyncResult,
)
from app.utils.helpers import serialize_mongo_doc, utc_now_iso

router = APIRouter(prefix="/calendar", tags=["Calendar Sync & Events"])


@router.get("/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch calendar events for user or general agenda."""
    user_id = user["id"] if user else "usr-1"
    docs = await db.calendar_events.find({"$or": [{"userId": user_id}, {"userId": {"$exists": False}}]}).to_list(100)
    return [CalendarEventResponse(**serialize_mongo_doc(d)) for d in docs]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    event_data: CalendarEventCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new schedule or interview event."""
    user_id = user["id"] if user else "usr-1"
    doc = event_data.model_dump()
    doc["id"] = f"evt-{uuid.uuid4().hex[:8]}"
    doc["userId"] = user_id
    doc["createdAt"] = utc_now_iso()
    await db.calendar_events.insert_one(doc)
    return CalendarEventResponse(**serialize_mongo_doc(doc))


@router.post("/google/sync", response_model=GoogleCalendarSyncResult)
async def sync_google_calendar(
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Simulate or execute Google Calendar OAuth2 sync."""
    user_id = user["id"] if user else "usr-1"
    user_email = user.get("email", "alex.rivera.dev@gmail.com") if user else "alex.rivera.dev@gmail.com"
    count = await db.calendar_events.count_documents({"$or": [{"userId": user_id}, {"userId": {"$exists": False}}]})

    now_str = datetime.now(timezone.utc).strftime("Today %I:%M %p")

    return GoogleCalendarSyncResult(
        success=True,
        syncedCount=max(1, count),
        lastSyncedAt=now_str,
        accountEmail=user_email,
    )
