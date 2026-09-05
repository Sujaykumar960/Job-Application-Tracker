from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

from app.schemas.notification import NotificationCategory, NotificationPriority
from app.utils.helpers import utc_now_iso


class NotificationModel(BaseModel):
    id: Optional[str] = None
    userId: str
    category: NotificationCategory
    title: str
    description: str
    timestamp: Optional[str] = "Just now"
    time: str = "Just now"
    isRead: bool = False
    priority: NotificationPriority = "normal"
    company: Optional[str] = None
    actionLabel: Optional[str] = None
    actionUrl: Optional[str] = None
    actionPayload: Optional[Dict[str, Any]] = None
    dedupKey: Optional[str] = None
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
