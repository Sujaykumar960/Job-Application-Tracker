from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.services.notification_service import NotificationService
from app.utils.helpers import serialize_mongo_doc, utc_now_iso
from app.websocket.manager import ws_manager


class ChatRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.conv_repo = BaseRepository(db, "conversations")
        self.msg_repo = BaseRepository(db, "messages")
        self.user_repo = BaseRepository(db, "users")
        self.profile_repo = BaseRepository(db, "profiles")

    async def get_or_create_conversation(self, user_a: str, user_b: str) -> Dict[str, Any]:
        """Find existing conversation between user_a and user_b or create a new one."""
        if user_a == user_b:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot start a conversation with themselves.",
            )

        # Check existing conversation
        doc = await self.conv_repo.find_one({
            "participants": {"$all": [user_a, user_b], "$size": 2}
        })
        if doc:
            return doc

        new_conv = {
            "participants": [user_a, user_b],
            "lastMessage": "",
            "lastMessageTime": "",
            "unreadCounts": {user_a: 0, user_b: 0},
            "createdAt": utc_now_iso(),
            "updatedAt": utc_now_iso(),
        }
        return await self.conv_repo.create(new_conv)

    async def _resolve_peer_info(self, peer_id: str) -> Dict[str, Any]:
        """Resolve peer metadata and online presence for conversation card."""
        prof = await self.profile_repo.find_one({"userId": peer_id})
        user_doc = await self.user_repo.find_one(self.user_repo._build_id_query(peer_id))

        name = "Peer Engineer"
        if prof and prof.get("name"):
            name = prof["name"]
        elif user_doc and user_doc.get("name"):
            name = user_doc["name"]

        headline = prof.get("headline", "Software Engineer") if prof else "Software Engineer"
        company = prof.get("company", "Tech") if prof else "Tech"
        avatar_gradient = prof.get("avatarGradient", "from-cyan-500 to-blue-600") if prof else "from-cyan-500 to-blue-600"
        parts = [p for p in name.split() if p]
        avatar_initials = prof.get("avatarInitials") if prof else None
        if not avatar_initials:
            avatar_initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "PE"

        is_online = ws_manager.is_connected(peer_id)
        last_active = "Active now" if is_online else "Recently"

        return {
            "id": peer_id,
            "name": name,
            "headline": headline,
            "company": company,
            "avatarInitials": avatar_initials,
            "avatarGradient": avatar_gradient,
            "isOnline": is_online,
            "lastActive": last_active,
        }

    async def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch all conversations for user, calculating dynamic unread count and peer card."""
        docs = await self.conv_repo.find_many({"participants": user_id}, sort=[("updatedAt", -1)])
        results = []
        for doc in docs:
            conv_id = doc.get("id") or str(doc.get("_id"))
            participants = doc.get("participants", [])
            peer_id = next((p for p in participants if p != user_id), None) or "usr_peer"
            peer_info = await self._resolve_peer_info(peer_id)

            # Calculate unread count strictly from unread messages sent by peer
            unread_count = await self.msg_repo.collection.count_documents({
                "conversationId": conv_id,
                "senderId": {"$ne": user_id},
                "status": {"$ne": "read"},
            })

            # Fetch recent messages (up to 50) with dynamic isOutgoing
            msg_cursor = self.msg_repo.collection.find({"conversationId": conv_id}).sort("createdAt", 1).limit(50)
            msg_docs = await msg_cursor.to_list(length=50)
            messages = []
            for m in msg_docs:
                m_serialized = serialize_mongo_doc(m)
                m_serialized["isOutgoing"] = m_serialized.get("senderId") == user_id
                messages.append(m_serialized)

            conv_dict = {
                "id": conv_id,
                "peer": peer_info,
                "lastMessage": doc.get("lastMessage", ""),
                "lastMessageTime": doc.get("lastMessageTime", ""),
                "unreadCount": unread_count,
                "messages": messages,
            }
            results.append(conv_dict)
        return results

    async def get_conversation_by_id(self, conversation_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch individual conversation, strictly guarding against non-participant access."""
        doc = await self.conv_repo.get_by_id(conversation_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID '{conversation_id}' not found.",
            )

        participants = doc.get("participants", [])
        if user_id not in participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a participant in this private conversation.",
            )

        peer_id = next((p for p in participants if p != user_id), None) or "usr_peer"
        peer_info = await self._resolve_peer_info(peer_id)

        unread_count = await self.msg_repo.collection.count_documents({
            "conversationId": conversation_id,
            "senderId": {"$ne": user_id},
            "status": {"$ne": "read"},
        })

        # Fetch messages with dynamic isOutgoing
        msg_cursor = self.msg_repo.collection.find({"conversationId": conversation_id}).sort("createdAt", 1).limit(100)
        msg_docs = await msg_cursor.to_list(length=100)
        messages = []
        for m in msg_docs:
            m_serialized = serialize_mongo_doc(m)
            m_serialized["isOutgoing"] = m_serialized.get("senderId") == user_id
            messages.append(m_serialized)

        return {
            "id": conversation_id,
            "peer": peer_info,
            "lastMessage": doc.get("lastMessage", ""),
            "lastMessageTime": doc.get("lastMessageTime", ""),
            "unreadCount": unread_count,
            "messages": messages,
        }

    async def get_conversation_messages(self, conversation_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Fetch messages history for a conversation, guarding participant access."""
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID '{conversation_id}' not found.",
            )

        if user_id not in conv.get("participants", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a participant in this conversation.",
            )

        docs = await self.msg_repo.find_many({"conversationId": conversation_id}, sort=[("createdAt", 1)])
        for d in docs:
            d["isOutgoing"] = (d.get("senderId") == user_id)
        return docs

    async def create_message_with_pipeline(
        self,
        conversation_id: str,
        sender_id: str,
        sender_name: str,
        content: str,
        attachment: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute full 6-step message creation, persistence, notification, and WebSocket pipeline."""
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID '{conversation_id}' not found.",
            )

        participants = conv.get("participants", [])
        if sender_id not in participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot send messages to a conversation you are not part of.",
            )

        recipients = [p for p in participants if p != sender_id]

        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        time_str = datetime.now(timezone.utc).strftime("%I:%M %p")
        now_iso = utc_now_iso()

        # Step 1: Persist message in database
        doc = {
            "id": msg_id,
            "conversationId": conversation_id,
            "senderId": sender_id,
            "senderName": sender_name,
            "content": content,
            "timestamp": time_str,
            "status": "sent",
            "attachment": attachment,
            "createdAt": now_iso,
        }
        created = await self.msg_repo.create(doc)

        # Step 2, 3 & 4: Update conversation metadata and recipient unread counts
        unread_counts = conv.get("unreadCounts", {})
        for r in recipients:
            unread_counts[r] = unread_counts.get(r, 0) + 1

        await self.conv_repo.update(conversation_id, {
            "lastMessage": content,
            "lastMessageTime": time_str,
            "unreadCounts": unread_counts,
            "updatedAt": now_iso,
        })

        # Step 5: Create in-app notification for each recipient
        for r in recipients:
            try:
                await NotificationService.notify_new_message(
                    db=self.db,
                    recipient_id=r,
                    sender_name=sender_name,
                    message_preview=content,
                    conversation_id=conversation_id,
                    message_id=msg_id,
                )
            except Exception:
                pass  # Notification generation failure shouldn't abort message send

        # Step 6: Publish WebSocket event to recipients and sender
        created_dict = dict(created)
        for r in recipients:
            recipient_msg = dict(created_dict)
            recipient_msg["isOutgoing"] = False
            await ws_manager.send_personal_envelope(
                {"type": "message", "payload": recipient_msg},
                r,
            )

        created["isOutgoing"] = True
        return created

    async def mark_message_read(self, message_id: str, user_id: str) -> Dict[str, Any]:
        """Mark a specific message as read if the user is a recipient."""
        msg = await self.msg_repo.get_by_id(message_id)
        if not msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Message with ID '{message_id}' not found.",
            )

        conv_id = msg.get("conversationId")
        conv = await self.conv_repo.get_by_id(conv_id)
        if not conv or user_id not in conv.get("participants", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        if msg.get("senderId") != user_id:
            await self.msg_repo.update(message_id, {"status": "read"})
            # Notify sender via WebSocket of read receipt
            sender_id = msg.get("senderId")
            if sender_id:
                await ws_manager.send_personal_envelope(
                    {"type": "read", "payload": {"messageId": message_id, "conversationId": conv_id}},
                    sender_id,
                )

        msg["status"] = "read"
        msg["isOutgoing"] = (msg.get("senderId") == user_id)
        return msg

    async def mark_conversation_read(self, conversation_id: str, user_id: str) -> None:
        """Mark all incoming messages in a conversation as read and reset user's unreadCount."""
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID '{conversation_id}' not found.",
            )

        if user_id not in conv.get("participants", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

        # Mark all messages sent by peer as read
        await self.msg_repo.collection.update_many(
            {"conversationId": conversation_id, "senderId": {"$ne": user_id}},
            {"$set": {"status": "read"}},
        )

        # Reset unread count for user
        unread_counts = conv.get("unreadCounts", {})
        unread_counts[user_id] = 0
        await self.conv_repo.update(conversation_id, {"unreadCounts": unread_counts})
