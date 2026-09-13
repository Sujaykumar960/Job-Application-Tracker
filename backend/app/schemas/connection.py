from typing import List, Literal, Optional
from pydantic import BaseModel, Field

ConnectionState = Literal["Connect", "Pending", "Connected", "not_connected", "pending", "connected"]
ConnectionStatus = Literal["Connect", "Pending", "Connected", "Declined", "pending", "accepted", "rejected", "cancelled"]


class NetworkUser(BaseModel):
    id: str
    name: str
    headline: str
    avatarInitials: str = "CX"
    avatarGradient: str = "from-cyan-500 to-blue-600"
    company: Optional[str] = None
    location: Optional[str] = "Remote"
    skills: List[str] = Field(default_factory=list)
    mutualCount: int = 0
    mutualNames: List[str] = Field(default_factory=list)
    connectionState: ConnectionState = "Connect"
    isFollowing: bool = False
    isIncomingRequest: Optional[bool] = False
    requestDate: Optional[str] = None
    connectedDate: Optional[str] = None
    note: Optional[str] = None
    requestId: Optional[str] = None
    senderId: Optional[str] = None
    recipientId: Optional[str] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


NetworkUserResponse = NetworkUser


class ConnectRequestPayload(BaseModel):
    note: Optional[str] = None


class ConnectionRequestCreate(BaseModel):
    recipientId: Optional[str] = None
    userId: Optional[str] = None
    receiverId: Optional[str] = None
    note: Optional[str] = None


class ConnectionCreate(BaseModel):
    receiverId: str
    note: Optional[str] = None


class ConnectionRespond(BaseModel):
    accept: bool


ConnectionRespondRequest = ConnectionRespond


class ConnectionResponse(BaseModel):
    id: str
    requesterId: str
    receiverId: str
    status: ConnectionStatus
    note: Optional[str] = None
    requestDate: str
    connectedDate: Optional[str] = None
    createdAt: Optional[str] = None


class ConnectionRequestResponse(BaseModel):
    id: str
    senderId: str
    recipientId: str
    status: str = "pending"
    note: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    connectionState: Optional[str] = None
    success: Optional[bool] = True
    message: Optional[str] = None
    requestId: Optional[str] = None


class NetworkSummaryResponse(BaseModel):
    connections: List[NetworkUser] = Field(default_factory=list)
    totalConnections: int = 0
    pendingIncomingCount: int = 0
    pendingOutgoingCount: int = 0


class ConnectionFilterQuery(BaseModel):
    status: Optional[str] = None
    limit: int = 50
    skip: int = 0


class FollowResponse(BaseModel):
    following: bool


class ConnectionActionResponse(BaseModel):
    success: bool
    message: str
    status: Optional[str] = None
    requestId: Optional[str] = None
