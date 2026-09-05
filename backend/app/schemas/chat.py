from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field

MessageStatus = Literal["sending", "sent", "delivered", "read"]
AttachmentType = Literal["pdf", "image", "code", "doc"]


class ChatAttachment(BaseModel):
    id: str
    name: str
    size: str
    type: AttachmentType = "pdf"
    url: Optional[str] = None


ChatAttachmentSchema = ChatAttachment


class ChatMessage(BaseModel):
    id: str
    conversationId: str
    senderId: str
    senderName: str
    content: str
    timestamp: str
    isOutgoing: bool = False
    status: MessageStatus = "sent"
    attachment: Optional[ChatAttachment] = None


ChatMessageResponse = ChatMessage


class MessageSendPayload(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000, description="Message text content")
    attachment: Optional[ChatAttachment] = None


# Backward-compatible alias
SendMessageRequest = MessageSendPayload


class ConversationPeer(BaseModel):
    id: str
    name: str
    headline: str
    company: str = ""
    avatarInitials: str = "CX"
    avatarGradient: str = "from-cyan-500 to-blue-600"
    isOnline: bool = False
    lastActive: str = "Just now"


class ChatConversation(BaseModel):
    id: str
    peer: ConversationPeer
    lastMessage: str = ""
    lastMessageTime: str = ""
    unreadCount: int = 0
    messages: List[ChatMessage] = Field(default_factory=list)


ConversationResponse = ChatConversation


class CreateConversationRequest(BaseModel):
    peerId: Optional[str] = None
    participantId: Optional[str] = None
    participantIds: Optional[List[str]] = None


# Backward-compatible alias
ConversationCreate = CreateConversationRequest


class MessageFilterQuery(BaseModel):
    conversationId: str
    limit: int = 50
    skip: int = 0


class WebSocketEnvelope(BaseModel):
    type: Literal["message", "typing", "read", "presence", "ping", "pong", "error"]
    payload: Any
