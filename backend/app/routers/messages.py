from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.chat_repository import ChatRepository
from app.repositories.user_repository import UserRepository
from app.schemas.chat import (
    ChatAttachment,
    ChatConversation,
    ChatMessage,
    CreateConversationRequest,
    MessageSendPayload,
)
from app.schemas.common import StandardSuccessResponse

router = APIRouter(prefix="/messages", tags=["Messages & Chat"])


@router.get("/conversations", response_model=List[ChatConversation])
async def get_conversations(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch all active recruiter and peer conversation threads for the user."""
    repo = ChatRepository(db)
    user_id = user["id"]
    return await repo.get_user_conversations(user_id)


@router.post("/conversations", response_model=ChatConversation, status_code=status.HTTP_201_CREATED)
async def create_or_get_conversation(
    payload: CreateConversationRequest,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Start or retrieve a conversation thread with a peer."""
    repo = ChatRepository(db)
    current_uid = user["id"]

    target_peer_id = payload.peerId or payload.participantId
    if not target_peer_id and payload.participantIds:
        target_peer_id = next((p for p in payload.participantIds if p != current_uid), None)

    if not target_peer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify a target peer ID to create conversation.",
        )

    conv = await repo.get_or_create_conversation(current_uid, target_peer_id)
    conv_id = conv.get("id") or str(conv.get("_id"))
    return await repo.get_conversation_by_id(conv_id, current_uid)


@router.get("/conversations/{conversation_id}", response_model=ChatConversation)
async def get_conversation_by_id(
    conversation_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch details and message history for specific conversation (Participant Only)."""
    repo = ChatRepository(db)
    viewing_uid = user["id"]
    return await repo.get_conversation_by_id(conversation_id, viewing_uid)


@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessage])
async def get_conversation_messages(
    conversation_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch message history for specific conversation thread (Participant Only)."""
    repo = ChatRepository(db)
    viewing_uid = user["id"]
    return await repo.get_conversation_messages(conversation_id, viewing_uid)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
@router.post("/conversations/{conversation_id}/send", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    payload: MessageSendPayload,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a direct message through 6-step dispatch pipeline with attachment support."""
    repo = ChatRepository(db)
    user_repo = UserRepository(db)

    sender_id = user["id"]
    sender_name = "User"

    if user:
        profile = await user_repo.get_profile(sender_id)
        if profile and profile.get("name"):
            sender_name = profile["name"]
        elif user.get("name"):
            sender_name = user["name"]
        elif user.get("email"):
            sender_name = user["email"].split("@")[0]

    attachment_dict = payload.attachment.model_dump() if payload.attachment else None

    created = await repo.create_message_with_pipeline(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_name=sender_name,
        content=payload.content,
        attachment=attachment_dict,
    )

    return ChatMessage(**created)


@router.patch("/{message_id}/read", response_model=ChatMessage)
async def mark_message_as_read(
    message_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Mark an individual message as read."""
    repo = ChatRepository(db)
    user_id = user["id"]
    res = await repo.mark_message_read(message_id, user_id)
    return ChatMessage(**res)


@router.post("/conversations/{conversation_id}/read", response_model=StandardSuccessResponse)
async def mark_conversation_as_read(
    conversation_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Mark all unread messages in conversation as read for the authenticated user."""
    repo = ChatRepository(db)
    user_id = user["id"]
    await repo.mark_conversation_read(conversation_id, user_id)
    return StandardSuccessResponse(success=True, message="Conversation marked as read.")
