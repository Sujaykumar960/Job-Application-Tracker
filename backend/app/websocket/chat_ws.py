from datetime import datetime, timezone
import json
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.database import get_database
from app.services.notification_service import NotificationService
from app.utils.helpers import utc_now_iso
from app.repositories.user_repository import UserRepository
from app.utils.security import decode_token
from app.websocket.manager import ws_manager

logger = logging.getLogger("careerx.websocket.chat")
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/chat")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """Production real-time messaging, typing, presence, and read-receipts WebSocket endpoint.
    Path: ws://localhost:8000/api/ws/chat?token=<JWT>
    """
    # 1. Mandatory authentication using the same checks as HTTP access tokens.
    if not token:
        logger.warning("WebSocket rejected: missing authentication token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token.")
        return

    payload = decode_token(token)
    if not payload or payload.get("token_type") != "access":
        logger.warning("WebSocket rejected: invalid or expired access token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired access token.")
        return

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        logger.warning("WebSocket rejected: token has no user identity.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid access token.")
        return

    try:
        db = get_database()
        revoked = await db.revoked_tokens.find_one({"token": token})
        if revoked:
            logger.warning("WebSocket rejected: revoked token for user '%s'.", user_id)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session has been revoked.")
            return

        user_repo = UserRepository(db)
        user_doc = await user_repo.get_by_id(user_id)
        if not user_doc or not user_doc.get("isActive", True):
            logger.warning("WebSocket rejected: user '%s' not found or deactivated.", user_id)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or deactivated.")
            return

        issued_at = payload.get("iat")
        last_logout_at = user_doc.get("lastLogoutAt")
        if issued_at and last_logout_at and issued_at < last_logout_at:
            logger.warning("WebSocket rejected: token predates logout for user '%s'.", user_id)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session has been revoked.")
            return
    except Exception as e:
        logger.error("Database error during WebSocket auth verification: %s", e)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Authentication check failed.")
        return

    # 2. Register with ConnectionManager
    await ws_manager.connect(websocket, user_id)

    # Broadcast presence announcement to peers
    await ws_manager.broadcast_envelope(
        {
            "type": "presence",
            "payload": {
                "userId": user_id,
                "isOnline": True,
                "lastActive": "Active now",
            },
        },
        exclude_user_id=user_id,
    )

    try:
        while True:
            text_data = await websocket.receive_text()

            # Malformed JSON handling: do NOT crash
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "payload": {"message": "Malformed JSON payload."}})
                )
                continue

            if not isinstance(data, dict):
                await websocket.send_text(
                    json.dumps({"type": "error", "payload": {"message": "WebSocket envelope must be a JSON object."}})
                )
                continue

            envelope_type = data.get("type")
            msg_payload = data.get("payload", {})
            if not isinstance(msg_payload, dict):
                msg_payload = {}

            # EVENT 1: MESSAGE
            if envelope_type == "message":
                conversation_id = msg_payload.get("conversationId")
                if not conversation_id:
                    await websocket.send_text(
                        json.dumps({"type": "error", "payload": {"message": "Missing conversationId in payload."}})
                    )
                    continue

                from app.repositories.base import BaseRepository
                conv_repo = BaseRepository(db, "conversations")
                conv = await conv_repo.get_by_id(conversation_id)
                if not conv:
                    await websocket.send_text(
                        json.dumps({"type": "error", "payload": {"message": f"Conversation '{conversation_id}' not found."}})
                    )
                    continue

                participants = conv.get("participants", [])
                # Participant Membership Validation
                if user_id not in participants:
                    await websocket.send_text(
                        json.dumps({"type": "error", "payload": {"message": "Unauthorized conversation access."}})
                    )
                    continue

                content = (msg_payload.get("content") or "").strip()
                attachment = msg_payload.get("attachment")
                if not content and not attachment:
                    await websocket.send_text(
                        json.dumps({"type": "error", "payload": {"message": "Message content or attachment required."}})
                    )
                    continue

                recipients = [p for p in participants if p != user_id]
                msg_id = f"msg_{uuid.uuid4().hex[:8]}"
                time_str = datetime.now(timezone.utc).strftime("%I:%M %p")
                now_iso = utc_now_iso()

                # Status is 'delivered' if at least one recipient has an active socket
                is_recipient_online = any(ws_manager.is_user_online(r) for r in recipients)
                msg_status = "delivered" if is_recipient_online else "sent"

                msg_doc = {
                    "id": msg_id,
                    "conversationId": conversation_id,
                    "senderId": user_id,  # Authoritative sender from JWT
                    "senderName": user_doc.get("name", "Alex Rivera"),
                    "content": content,
                    "timestamp": time_str,
                    "status": msg_status,
                    "attachment": attachment,
                    "createdAt": now_iso,
                }
                await db.messages.insert_one(msg_doc)

                # Update conversation metadata and recipient unread counts
                unread_counts = conv.get("unreadCounts", {})
                for r in recipients:
                    unread_counts[r] = unread_counts.get(r, 0) + 1

                await conv_repo.update(
                    conversation_id,
                    {
                        "lastMessage": content,
                        "lastMessageTime": time_str,
                        "unreadCounts": unread_counts,
                        "updatedAt": now_iso,
                    },
                )

                # Send in-app notification to each recipient
                for r in recipients:
                    try:
                        await NotificationService.notify_new_message(
                            db=db,
                            recipient_id=r,
                            sender_name=user_doc.get("name", "Alex Rivera"),
                            message_preview=content,
                            conversation_id=conversation_id,
                            message_id=msg_id,
                        )
                    except Exception as notif_err:
                        logger.warning("Error creating message notification: %s", notif_err)

                # Deliver real-time event to recipient(s) (isOutgoing = False)
                recipient_packet = dict(msg_doc)
                recipient_packet.pop("_id", None)
                recipient_packet["isOutgoing"] = False
                for r in recipients:
                    await ws_manager.send_personal_envelope(
                        {"type": "message", "payload": recipient_packet},
                        r,
                    )

                # Deliver confirmation to sender (isOutgoing = True)
                sender_packet = dict(msg_doc)
                sender_packet.pop("_id", None)
                sender_packet["isOutgoing"] = True
                await websocket.send_text(json.dumps({"type": "message", "payload": sender_packet}))

            # EVENT 2: TYPING
            elif envelope_type == "typing":
                conversation_id = msg_payload.get("conversationId")
                if conversation_id:
                    from app.repositories.base import BaseRepository
                    conv_repo = BaseRepository(db, "conversations")
                    conv = await conv_repo.get_by_id(conversation_id)
                    if conv and user_id in conv.get("participants", []):
                        is_typing = msg_payload.get("isTyping", msg_payload.get("typing", True))
                        await ws_manager.broadcast_to_participants(
                            {
                                "type": "typing",
                                "payload": {
                                    "conversationId": conversation_id,
                                    "senderId": user_id,
                                    "isTyping": is_typing,
                                },
                            },
                            participant_ids=conv.get("participants", []),
                            exclude_user_id=user_id,
                        )

            # EVENT 3: READ
            elif envelope_type == "read":
                conversation_id = msg_payload.get("conversationId")
                message_id = msg_payload.get("messageId")
                if conversation_id:
                    from app.repositories.base import BaseRepository
                    conv_repo = BaseRepository(db, "conversations")
                    conv = await conv_repo.get_by_id(conversation_id)
                    if conv and user_id in conv.get("participants", []):
                        if message_id:
                            await db.messages.update_one(
                                {"id": message_id, "conversationId": conversation_id},
                                {"$set": {"status": "read"}},
                            )
                        else:
                            await db.messages.update_many(
                                {"conversationId": conversation_id, "senderId": {"$ne": user_id}},
                                {"$set": {"status": "read"}},
                            )

                        unread_counts = conv.get("unreadCounts", {})
                        unread_counts[user_id] = 0
                        await conv_repo.update(conversation_id, {"unreadCounts": unread_counts})

                        await ws_manager.broadcast_to_participants(
                            {
                                "type": "read",
                                "payload": {
                                    "conversationId": conversation_id,
                                    "messageId": message_id,
                                    "readerId": user_id,
                                },
                            },
                            participant_ids=conv.get("participants", []),
                            exclude_user_id=user_id,
                        )

            # EVENT 4: PRESENCE
            elif envelope_type == "presence":
                target_uid = msg_payload.get("userId")
                if target_uid:
                    is_online = ws_manager.is_user_online(target_uid)
                    await websocket.send_text(
                        json.dumps({
                            "type": "presence",
                            "payload": {
                                "userId": target_uid,
                                "isOnline": is_online,
                                "lastActive": "Active now" if is_online else "Recently",
                            },
                        })
                    )
                else:
                    await websocket.send_text(
                        json.dumps({
                            "type": "presence",
                            "payload": {"onlineUsers": ws_manager.get_online_users()},
                        })
                    )

            # PING / PONG
            elif envelope_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "payload": {}}))

            # UNSUPPORTED EVENT
            else:
                await websocket.send_text(
                    json.dumps({
                        "type": "error",
                        "payload": {"message": f"Unsupported event type '{envelope_type}'."},
                    })
                )

    except WebSocketDisconnect:
        disconnected_user, remaining_tabs = ws_manager.disconnect(websocket)
        if disconnected_user and remaining_tabs == 0:
            await ws_manager.broadcast_envelope({
                "type": "presence",
                "payload": {
                    "userId": disconnected_user,
                    "isOnline": False,
                    "lastActive": "Just now",
                },
            })
    except Exception as e:
        logger.error("Unexpected error in chat WebSocket session: %s", e)
        ws_manager.disconnect(websocket)
