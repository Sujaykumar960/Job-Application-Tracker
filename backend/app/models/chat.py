from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso

AttachmentType = Literal["pdf", "image", "code", "doc"]
MessageDeliveryStatus = Literal["sending", "sent", "delivered", "read"]


class ChatAttachmentModel(BaseModel):
    id: str
    name: str
    size: str
    type: AttachmentType = "pdf"
    url: Optional[str] = None


class MessageModel(BaseModel):
    id: Optional[str] = None
    conversationId: str
    senderId: str
    senderName: str
    content: str
    timestamp: Optional[str] = None
    status: MessageDeliveryStatus = "sent"
    attachment: Optional[ChatAttachmentModel] = None
    createdAt: str = Field(default_factory=utc_now_iso)


class ConversationModel(BaseModel):
    id: Optional[str] = None
    participants: List[str] = Field(default_factory=list)
    lastMessage: str = ""
    lastMessageTime: str = ""
    unreadCounts: Dict[str, int] = Field(default_factory=dict)  # userId -> unread count
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: str = Field(default_factory=utc_now_iso)
