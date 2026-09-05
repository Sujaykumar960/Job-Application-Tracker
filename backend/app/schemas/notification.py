from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field, model_validator

NotificationPriority = Literal["urgent", "normal", "low"]
NotificationCategory = Literal[
    "interview_reminder",
    "application_deadline",
    "follow_up",
    "message",
    "connection_request",
    "job_recommendation",
    "learning_achievement",
]


class CareerNotification(BaseModel):
    id: str
    category: NotificationCategory
    title: str
    description: str
    timestamp: Optional[str] = "Just now"
    time: Optional[str] = "Just now"
    createdAt: str
    isRead: bool = False
    priority: NotificationPriority = "normal"
    company: Optional[str] = None
    actionLabel: Optional[str] = None
    actionUrl: Optional[str] = None
    actionPayload: Optional[Dict[str, Any]] = None


NotificationResponse = CareerNotification


class NotificationCreate(BaseModel):
    category: NotificationCategory
    title: str
    description: str
    priority: NotificationPriority = "normal"
    company: Optional[str] = None
    actionLabel: Optional[str] = None
    actionUrl: Optional[str] = None
    actionPayload: Optional[Dict[str, Any]] = None
    dedupKey: Optional[str] = None


class NotificationUpdate(BaseModel):
    isRead: Optional[bool] = None


class NotificationFilterQuery(BaseModel):
    category: Optional[str] = None
    isRead: Optional[bool] = None
    priority: Optional[str] = None
    limit: int = 50
    skip: int = 0
    page: Optional[int] = None


class UnreadCountResponse(BaseModel):
    unreadCount: int
    count: Optional[int] = None

    @model_validator(mode="after")
    def populate_count(self) -> "UnreadCountResponse":
        if self.count is None:
            self.count = self.unreadCount
        return self
