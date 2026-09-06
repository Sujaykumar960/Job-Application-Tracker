from typing import Optional
from pydantic import BaseModel, Field


class CalendarEventBase(BaseModel):
    title: str
    type: str = "Interview"
    date: str
    time: str = "10:00 AM"
    endTime: Optional[str] = None
    company: Optional[str] = None
    locationOrUrl: Optional[str] = None
    notes: Optional[str] = None
    googleCalendarEventId: Optional[str] = None
    isSyncedWithGoogle: bool = True


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventResponse(CalendarEventBase):
    id: str
    userId: Optional[str] = None


class GoogleCalendarSyncResult(BaseModel):
    success: bool = True
    syncedCount: int = 0
    lastSyncedAt: Optional[str] = None
    accountEmail: Optional[str] = None
