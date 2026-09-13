from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso

ConnectionStatus = Literal["Connect", "Pending", "Connected", "Declined", "pending", "accepted", "rejected", "cancelled"]


class ConnectionModel(BaseModel):
    id: Optional[str] = None
    requesterId: str
    receiverId: str
    status: ConnectionStatus = "Pending"
    note: Optional[str] = None
    requestDate: str = Field(default_factory=utc_now_iso)
    connectedDate: Optional[str] = None
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None


class ConnectionRequestModel(BaseModel):
    id: Optional[str] = None
    senderId: str
    recipientId: str
    status: ConnectionStatus = "pending"
    note: Optional[str] = None
    requestDate: str = Field(default_factory=utc_now_iso)
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None


class FollowModel(BaseModel):
    id: Optional[str] = None
    followerId: str
    targetUserId: str
    createdAt: str = Field(default_factory=utc_now_iso)
