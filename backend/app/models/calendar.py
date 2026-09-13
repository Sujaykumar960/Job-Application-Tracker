from typing import List, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso


class CalendarEventModel(BaseModel):
    id: Optional[str] = None
    userId: str
    title: str
    type: str = "Interview"
    date: str  # YYYY-MM-DD
    time: str = "10:00 AM"
    endTime: Optional[str] = None
    timezone: str = "UTC"
    company: Optional[str] = None
    locationOrUrl: Optional[str] = None
    notes: Optional[str] = None
    participants: List[str] = Field(default_factory=list)
    googleCalendarEventId: Optional[str] = None
    isSyncedWithGoogle: bool = True
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None