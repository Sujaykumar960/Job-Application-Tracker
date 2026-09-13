from datetime import datetime
import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


def parse_time_to_minutes(time_str: str) -> Optional[int]:
    time_str = time_str.strip()
    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
        try:
            dt = datetime.strptime(time_str, fmt)
            return dt.hour * 60 + dt.minute
        except ValueError:
            continue
    return None


class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    type: str = "Interview"
    date: str
    time: str = "10:00 AM"
    endTime: Optional[str] = None
    timezone: Optional[str] = "UTC"
    company: Optional[str] = None
    locationOrUrl: Optional[str] = None
    notes: Optional[str] = None
    participants: Optional[List[str]] = None
    googleCalendarEventId: Optional[str] = None
    isSyncedWithGoogle: bool = True

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be formatted as YYYY-MM-DD")
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid calendar date")
        return v

    @model_validator(mode="after")
    def validate_time_range(self) -> "CalendarEventBase":
        if self.time and self.endTime:
            start_min = parse_time_to_minutes(self.time)
            end_min = parse_time_to_minutes(self.endTime)
            if start_min is not None and end_min is not None:
                if end_min <= start_min:
                    raise ValueError("endTime must be later than startTime")
        return self


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    endTime: Optional[str] = None
    timezone: Optional[str] = None
    company: Optional[str] = None
    locationOrUrl: Optional[str] = None
    notes: Optional[str] = None
    participants: Optional[List[str]] = None
    googleCalendarEventId: Optional[str] = None
    isSyncedWithGoogle: Optional[bool] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise ValueError("Date must be formatted as YYYY-MM-DD")
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise ValueError("Invalid calendar date")
        return v

    @model_validator(mode="after")
    def validate_time_range(self) -> "CalendarEventUpdate":
        if self.time and self.endTime:
            start_min = parse_time_to_minutes(self.time)
            end_min = parse_time_to_minutes(self.endTime)
            if start_min is not None and end_min is not None:
                if end_min <= start_min:
                    raise ValueError("endTime must be later than startTime")
        return self


class CalendarEventResponse(CalendarEventBase):
    id: str
    userId: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class GoogleCalendarSyncResult(BaseModel):
    success: bool = True
    syncedCount: int = 0
    lastSyncedAt: str
    accountEmail: str