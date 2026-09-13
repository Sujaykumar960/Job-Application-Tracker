import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.connection import NetworkUser
from app.services.notification_service import NotificationService
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class ConnectionRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "connections")
        self.follows = db["follows"]
        self.users = db["users"]
        self.profiles = db["profiles"]

    async def get_user_connected_ids(self, user_id: str) -> Set[str]:
        """Fetch all confirmed 1st-degree connected user IDs for a given user."""
        cursor = self.collection.find({
            "$or": [{"requesterId": user_id}, {"receiverId": user_id}],
            "status": "Connected",
        })
        docs = await cursor.to_list(length=500)
        connected_ids: Set[str] = set()
        for d in docs:
            peer_id = d["receiverId"] if d["requesterId"] == user_id else d["requesterId"]
            connected_ids.add(peer_id)
        return connected_ids

    async def get_mutual_connections(self, user_a: str, user_b: str) -> Tuple[int, List[str]]:
        """Calculate true mutual connections between user_a and user_b without fabrication."""
        if not user_a or not user_b or user_a == user_b:
            return 0, []

        set_a = await self.get_user_connected_ids(user_a)
        set_b = await self.get_user_connected_ids(user_b)
        mutual_ids = list(set_a.intersection(set_b))

        if not mutual_ids:
            return 0, []

        # Fetch names for up to 3 mutual friends
        sample_ids = mutual_ids[:3]
        names = []
        for mid in sample_ids:
            prof = await self.profiles.find_one({"userId": mid})
            if prof and prof.get("name"):
                names.append(prof["name"])
            else:
                u = await self.users.find_one(self._build_id_query(mid))
                if u and u.get("name"):
                    names.append(u["name"])

        return len(mutual_ids), names

    async def get_connection_details_between(
        self,
        viewer_id: Optional[str],
        target_id: str,
    ) -> Dict[str, Any]:
        """Derive connection state, incoming flag, dates, and note between viewer and target."""
        if not viewer_id or viewer_id == target_id:
            return {
                "connectionState": "Connect",
                "isIncomingRequest": False,
                "requestDate": None,
                "connectedDate": None,
                "note": None,
                "requestId": None,
            }

        doc = await self.collection.find_one({
            "$or": [
                {"requesterId": viewer_id, "receiverId": target_id},
                {"requesterId": target_id, "receiverId": viewer_id},
            ]
        })

        if not doc:
            doc = await self.db["connection_requests"].find_one({
                "$or": [
                    {"senderId": viewer_id, "recipientId": target_id},
                    {"senderId": target_id, "recipientId": viewer_id},
                ]
            })
            if doc:
                req_id = str(doc.get("id") or doc.get("_id", ""))
                status_val = doc.get("status", "Connect")
                if status_val in ("Pending", "pending"):
                    is_incoming = doc.get("recipientId") == viewer_id
                    return {
                        "connectionState": "Pending",
                        "isIncomingRequest": is_incoming,
                        "requestDate": doc.get("requestDate"),
                        "connectedDate": None,
                        "note": doc.get("note"),
                        "requestId": req_id,
                    }
                if status_val in ("Connected", "Accepted"):
                    return {
                        "connectionState": "Connected",
                        "isIncomingRequest": False,
                        "requestDate": doc.get("requestDate"),
                        "connectedDate": doc.get("connectedDate") or doc.get("updatedAt"),
                        "note": doc.get("note"),
                        "requestId": req_id,
                    }
            return {
                "connectionState": "Connect",
                "isIncomingRequest": False,
                "requestDate": None,
                "connectedDate": None,
                "note": None,
                "requestId": None,
            }

        req_id = str(doc.get("id") or doc.get("_id", ""))
        status_val = doc.get("status", "Connect")

        if status_val == "Connected":
            return {
                "connectionState": "Connected",
                "isIncomingRequest": False,
                "requestDate": doc.get("requestDate"),
                "connectedDate": doc.get("connectedDate"),
                "note": doc.get("note"),
                "requestId": req_id,
            }

        if status_val == "Pending":
            is_incoming = doc.get("receiverId") == viewer_id
            return {
                "connectionState": "Pending",
                "isIncomingRequest": is_incoming,
                "requestDate": doc.get("requestDate"),
                "connectedDate": None,
                "note": doc.get("note"),
                "requestId": req_id,
            }

        # Declined or other state
        return {
            "connectionState": "Connect",
            "isIncomingRequest": False,
            "requestDate": None,
            "connectedDate": None,
            "note": None,
            "requestId": req_id,
        }

    async def is_following(self, follower_id: Optional[str], target_user_id: str) -> bool:
        if not follower_id:
            return False
        doc = await self.follows.find_one({"followerId": follower_id, "targetUserId": target_user_id})
        return doc is not None

    async def follow_user(self, follower_id: str, target_user_id: str) -> bool:
        if follower_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot follow themselves.",
            )
        await self.follows.update_one(
            {"followerId": follower_id, "targetUserId": target_user_id},
            {"$setOnInsert": {"createdAt": utc_now_iso()}},
            upsert=True,
        )
        return True

    async def unfollow_user(self, follower_id: str, target_user_id: str) -> bool:
        res = await self.follows.delete_one({"followerId": follower_id, "targetUserId": target_user_id})
        return res.deleted_count > 0

    async def toggle_follow(self, follower_id: str, target_user_id: str) -> bool:
        if follower_id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot follow themselves.",
            )
        existing = await self.follows.find_one({"followerId": follower_id, "targetUserId": target_user_id})
        if existing:
            await self.follows.delete_one({"_id": existing["_id"]})
            return False
        else:
            await self.follows.insert_one({"followerId": follower_id, "targetUserId": target_user_id, "createdAt": utc_now_iso()})
            return True

    async def send_connection_request(
        self,
        requester_id: str,
        receiver_id: str,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send connection request with self-connection and duplicate guards."""
        if requester_id == receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot connect to themselves.",
            )

        # Check existing connection or request in connections and connection_requests
        existing = await self.collection.find_one({
            "$or": [
                {"requesterId": requester_id, "receiverId": receiver_id},
                {"requesterId": receiver_id, "receiverId": requester_id},
            ]
        })
        if not existing:
            existing = await self.db["connection_requests"].find_one({
                "$or": [
                    {"senderId": requester_id, "recipientId": receiver_id},
                    {"senderId": receiver_id, "recipientId": requester_id},
                ]
            })

        now = utc_now_iso()
        if existing:
            current_status = existing.get("status", "")
            if current_status in ("Connected", "connected", "Accepted", "accepted"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Users are already connected.",
                )
            if current_status in ("Pending", "pending"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A connection request is already pending between these users.",
                )

            req_id = str(existing.get("id") or existing.get("_id") or f"req_{uuid.uuid4().hex[:8]}")
            # Re-activate declined/cancelled request as fresh pending request
            update_data = {
                "id": req_id,
                "requesterId": requester_id,
                "receiverId": receiver_id,
                "status": "Pending",
                "note": note,
                "requestDate": now,
                "updatedAt": now,
            }
            await self.collection.update_one(
                {"$or": [
                    {"requesterId": requester_id, "receiverId": receiver_id},
                    {"requesterId": receiver_id, "receiverId": requester_id},
                ]},
                {"$set": update_data},
                upsert=True,
            )
            await self.db["connection_requests"].update_one(
                {"$or": [
                    {"senderId": requester_id, "recipientId": receiver_id},
                    {"senderId": receiver_id, "recipientId": requester_id},
                ]},
                {"$set": {
                    "id": req_id,
                    "senderId": requester_id,
                    "recipientId": receiver_id,
                    "status": "pending",
                    "note": note,
                    "requestDate": now,
                    "updatedAt": now,
                }},
                upsert=True,
            )
        else:
            req_id = f"req_{uuid.uuid4().hex[:8]}"
            conn_doc = {
                "id": req_id,
                "requesterId": requester_id,
                "receiverId": receiver_id,
                "status": "Pending",
                "note": note,
                "requestDate": now,
                "createdAt": now,
                "updatedAt": now,
            }
            await self.collection.insert_one(conn_doc)

            req_doc = {
                "id": req_id,
                "senderId": requester_id,
                "recipientId": receiver_id,
                "status": "pending",
                "note": note,
                "requestDate": now,
                "createdAt": now,
                "updatedAt": now,
            }
            await self.db["connection_requests"].insert_one(req_doc)

        # Notify recipient
        sender_prof = await self.profiles.find_one({"userId": requester_id}) or {}
        sender_user = await self.users.find_one(self._build_id_query(requester_id)) or {}
        sender_name = sender_prof.get("name") or sender_user.get("name") or "CareerX Engineer"
        sender_company = sender_prof.get("company") or sender_user.get("company")
        await NotificationService.notify_connection_request(
            self.db,
            recipient_id=receiver_id,
            requester_name=sender_name,
            requester_company=sender_company,
            note=note,
            request_id=req_id,
        )

        return {
            "id": req_id,
            "senderId": requester_id,
            "recipientId": receiver_id,
            "status": "pending",
            "note": note,
            "createdAt": now,
            "updatedAt": now,
            "connectionState": "Pending",
            "success": True,
            "message": "Connection request sent successfully.",
            "requestId": req_id,
        }

    async def accept_connection_request(self, request_id: str, receiver_id: str) -> Dict[str, Any]:
        """Accept an incoming connection request strictly by the recipient."""
        id_q = self._build_id_query(request_id)
        request = await self.collection.find_one(id_q)
        req_alt = await self.db["connection_requests"].find_one(id_q)
        if not request and not req_alt:
            # Fallback check if request_id was actually requester_id
            request = await self.collection.find_one({
                "requesterId": request_id,
                "receiverId": receiver_id,
                "status": {"$in": ["Pending", "pending"]},
            })
            req_alt = await self.db["connection_requests"].find_one({
                "senderId": request_id,
                "recipientId": receiver_id,
                "status": {"$in": ["Pending", "pending"]},
            })

        if not request and not req_alt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection request with ID '{request_id}' not found.",
            )

        target_doc = request or req_alt
        actual_receiver = target_doc.get("receiverId") or target_doc.get("recipientId")
        actual_sender = target_doc.get("requesterId") or target_doc.get("senderId")
        resolved_req_id = str(target_doc.get("id") or target_doc.get("_id", request_id))

        if actual_receiver != receiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. Only the recipient can accept this connection request.",
            )

        now = utc_now_iso()
        # Update connection_requests
        await self.db["connection_requests"].update_many(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"senderId": actual_sender, "recipientId": receiver_id},
            ]},
            {"$set": {"status": "accepted", "updatedAt": now}},
        )

        # Update or create 1st-degree connection in connections collection
        await self.collection.find_one_and_update(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"requesterId": actual_sender, "receiverId": receiver_id},
                {"requesterId": receiver_id, "receiverId": actual_sender},
            ]},
            {"$set": {
                "requesterId": actual_sender,
                "receiverId": receiver_id,
                "status": "Connected",
                "connectedDate": now,
                "updatedAt": now,
            }},
            upsert=True,
            return_document=True,
        )

        # Notify sender that request was accepted
        rec_prof = await self.profiles.find_one({"userId": receiver_id}) or {}
        rec_user = await self.users.find_one(self._build_id_query(receiver_id)) or {}
        rec_name = rec_prof.get("name") or rec_user.get("name") or "CareerX Engineer"
        rec_company = rec_prof.get("company") or rec_user.get("company")
        await NotificationService.notify_connection_accepted(
            self.db,
            recipient_id=actual_sender,
            peer_name=rec_name,
            peer_company=rec_company,
            request_id=resolved_req_id,
        )

        return {
            "id": resolved_req_id,
            "senderId": actual_sender,
            "recipientId": receiver_id,
            "status": "Connected",
            "connectionState": "Connected",
            "connectedDate": now,
            "createdAt": target_doc.get("createdAt") or target_doc.get("requestDate", now),
            "updatedAt": now,
            "success": True,
            "message": "Connection request accepted.",
            "requestId": resolved_req_id,
        }

    async def reject_connection_request(self, request_id: str, receiver_id: str) -> Dict[str, Any]:
        """Reject an incoming connection request strictly by the recipient."""
        id_q = self._build_id_query(request_id)
        request = await self.collection.find_one(id_q)
        req_alt = await self.db["connection_requests"].find_one(id_q)
        if not request and not req_alt:
            request = await self.collection.find_one({
                "requesterId": request_id,
                "receiverId": receiver_id,
                "status": {"$in": ["Pending", "pending"]},
            })
            req_alt = await self.db["connection_requests"].find_one({
                "senderId": request_id,
                "recipientId": receiver_id,
                "status": {"$in": ["Pending", "pending"]},
            })

        if not request and not req_alt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection request with ID '{request_id}' not found.",
            )

        target_doc = request or req_alt
        actual_receiver = target_doc.get("receiverId") or target_doc.get("recipientId")
        actual_sender = target_doc.get("requesterId") or target_doc.get("senderId")
        resolved_req_id = str(target_doc.get("id") or target_doc.get("_id", request_id))

        if actual_receiver != receiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. Only the recipient can reject this connection request.",
            )

        now = utc_now_iso()
        await self.db["connection_requests"].update_many(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"senderId": actual_sender, "recipientId": receiver_id},
            ]},
            {"$set": {"status": "rejected", "updatedAt": now}},
        )
        await self.collection.update_many(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"requesterId": actual_sender, "receiverId": receiver_id},
            ]},
            {"$set": {"status": "Declined", "updatedAt": now}},
        )

        return {
            "id": resolved_req_id,
            "senderId": actual_sender,
            "recipientId": receiver_id,
            "status": "Declined",
            "connectionState": "Connect",
            "createdAt": target_doc.get("createdAt") or target_doc.get("requestDate", now),
            "updatedAt": now,
            "success": True,
            "message": "Connection request declined.",
            "requestId": resolved_req_id,
        }

    async def cancel_connection_request(self, request_id: str, caller_user_id: str) -> Dict[str, Any]:
        """Cancel an outgoing pending connection request strictly by the sender."""
        id_q = self._build_id_query(request_id)
        request = await self.collection.find_one(id_q)
        req_alt = await self.db["connection_requests"].find_one(id_q)
        if not request and not req_alt:
            request = await self.collection.find_one({
                "requesterId": caller_user_id,
                "receiverId": request_id,
                "status": {"$in": ["Pending", "pending"]},
            })
            req_alt = await self.db["connection_requests"].find_one({
                "senderId": caller_user_id,
                "recipientId": request_id,
                "status": {"$in": ["Pending", "pending"]},
            })

        if not request and not req_alt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection request with ID '{request_id}' not found.",
            )

        target_doc = request or req_alt
        actual_sender = target_doc.get("requesterId") or target_doc.get("senderId")
        actual_receiver = target_doc.get("receiverId") or target_doc.get("recipientId")
        resolved_req_id = str(target_doc.get("id") or target_doc.get("_id", request_id))

        if actual_sender != caller_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. Only the sender can cancel this connection request.",
            )

        current_status = target_doc.get("status")
        if current_status in ("Connected", "connected", "Accepted", "accepted"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a request that has already been accepted.",
            )

        now = utc_now_iso()
        await self.db["connection_requests"].update_many(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"senderId": actual_sender, "recipientId": actual_receiver},
            ]},
            {"$set": {"status": "cancelled", "updatedAt": now}},
        )
        await self.collection.delete_many(
            {"$or": [
                {"id": resolved_req_id},
                {"_id": target_doc.get("_id")},
                {"requesterId": actual_sender, "receiverId": actual_receiver, "status": {"$in": ["Pending", "pending"]}},
            ]}
        )

        return {
            "id": resolved_req_id,
            "senderId": actual_sender,
            "recipientId": actual_receiver,
            "status": "cancelled",
            "connectionState": "Connect",
            "updatedAt": now,
            "success": True,
            "message": "Connection request cancelled.",
            "requestId": resolved_req_id,
        }

    async def remove_connection(self, user_a: str, user_b: str) -> bool:
        """Remove/disconnect 1st-degree connection between two users."""
        res = await self.collection.delete_one({
            "$or": [
                {"requesterId": user_a, "receiverId": user_b, "status": {"$in": ["Connected", "connected"]}},
                {"requesterId": user_b, "receiverId": user_a, "status": {"$in": ["Connected", "connected"]}},
            ]
        })
        if res.deleted_count > 0:
            await self.db["connection_requests"].delete_many({
                "$or": [
                    {"senderId": user_a, "recipientId": user_b},
                    {"senderId": user_b, "recipientId": user_a},
                ]
            })
            return True
        return False

    async def build_network_user(
        self,
        target_id: str,
        viewing_user_id: Optional[str] = None,
        preloaded_profile: Optional[Dict[str, Any]] = None,
    ) -> NetworkUser:
        """Hydrate complete NetworkUser object with dynamic relationship states."""
        prof = preloaded_profile
        if not prof:
            prof = await self.profiles.find_one({"userId": target_id}) or {}

        # Fetch user document to get the authoritative name if not in profile
        name = prof.get("name")
        if not name:
            u = await self.users.find_one(self._build_id_query(target_id))
            if u and u.get("name"):
                name = u["name"]

        name_str = name if isinstance(name, str) and name.strip() else "Engineering Peer"
        name = name_str
        headline = prof.get("headline") or "Software Engineer"
        company = prof.get("company") or "Technology"
        location = prof.get("location") or "Remote"
        skills = prof.get("skills") or []
        parts = [p for p in name.split() if p]
        avatar_initials = prof.get("avatarInitials") or ("".join([p[0].upper() for p in parts[:2]]) if parts else "CX")
        avatar_gradient = prof.get("avatarGradient") or "from-brand-600 to-indigo-800"

        mutual_count, mutual_names = await self.get_mutual_connections(viewing_user_id or "", target_id)
        conn_details = await self.get_connection_details_between(viewing_user_id, target_id)
        following = await self.is_following(viewing_user_id, target_id)

        return NetworkUser(
            id=target_id,
            name=name,
            headline=headline,
            avatarInitials=avatar_initials,
            avatarGradient=avatar_gradient,
            company=company,
            location=location,
            skills=skills,
            mutualCount=mutual_count,
            mutualNames=mutual_names,
            connectionState=conn_details["connectionState"],
            isFollowing=following,
            isIncomingRequest=conn_details["isIncomingRequest"],
            requestDate=conn_details["requestDate"],
            connectedDate=conn_details["connectedDate"],
            note=conn_details["note"],
            requestId=conn_details["requestId"],
        )

    async def get_connections(self, user_id: str) -> List[NetworkUser]:
        """Fetch all confirmed connections for user."""
        connected_ids = await self.get_user_connected_ids(user_id)
        results = []
        for peer_id in connected_ids:
            results.append(await self.build_network_user(peer_id, viewing_user_id=user_id))
        return results

    async def get_incoming_requests(self, user_id: str) -> List[NetworkUser]:
        """Fetch incoming pending connection requests for user."""
        cursor = self.collection.find({"receiverId": user_id, "status": {"$in": ["Pending", "pending"]}})
        docs = await cursor.to_list(length=100)
        seen_senders = set()
        results = []
        for d in docs:
            sender_id = d.get("requesterId")
            if sender_id and sender_id not in seen_senders:
                seen_senders.add(sender_id)
                u = await self.build_network_user(sender_id, viewing_user_id=user_id)
                u.requestId = str(d.get("id") or d.get("_id", ""))
                u.note = d.get("note")
                u.requestDate = d.get("requestDate") or d.get("createdAt")
                u.createdAt = d.get("createdAt") or d.get("requestDate")
                u.updatedAt = d.get("updatedAt")
                u.isIncomingRequest = True
                u.senderId = sender_id
                u.recipientId = user_id
                u.status = "pending"
                results.append(u)

        req_cursor = self.db["connection_requests"].find({"recipientId": user_id, "status": {"$in": ["Pending", "pending"]}})
        req_docs = await req_cursor.to_list(length=100)
        for rd in req_docs:
            sender_id = rd.get("senderId")
            if sender_id and sender_id not in seen_senders:
                seen_senders.add(sender_id)
                u = await self.build_network_user(sender_id, viewing_user_id=user_id)
                u.requestId = str(rd.get("id") or rd.get("_id", ""))
                u.note = rd.get("note")
                u.requestDate = rd.get("requestDate") or rd.get("createdAt")
                u.createdAt = rd.get("createdAt") or rd.get("requestDate")
                u.updatedAt = rd.get("updatedAt")
                u.isIncomingRequest = True
                u.senderId = sender_id
                u.recipientId = user_id
                u.status = "pending"
                results.append(u)

        return results

    async def get_network_summary(self, user_id: str) -> Dict[str, Any]:
        """Fetch summary of user's connections and request counts."""
        connections = await self.get_connections(user_id)
        incoming = await self.get_incoming_requests(user_id)
        outgoing_pending = await self.collection.count_documents({
            "requesterId": user_id,
            "status": {"$in": ["Pending", "pending"]},
        })
        return {
            "connections": connections,
            "totalConnections": len(connections),
            "pendingIncomingCount": len(incoming),
            "pendingOutgoingCount": outgoing_pending,
        }

    async def get_suggestions(self, user_id: str, limit: int = 20) -> List[NetworkUser]:
        """Fetch recommended peers ranked by shared skills, company, and mutual connections."""
        # Get all users already in relationship (Connected or Pending)
        rel_cursor = self.collection.find({
            "$or": [{"requesterId": user_id}, {"receiverId": user_id}],
            "status": {"$in": ["Connected", "Pending"]},
        })
        rel_docs = await rel_cursor.to_list(length=500)
        excluded_ids = {user_id}
        for d in rel_docs:
            excluded_ids.add(d["requesterId"])
            excluded_ids.add(d["receiverId"])

        alt_reqs = await self.db["connection_requests"].find({
            "$or": [{"senderId": user_id}, {"recipientId": user_id}],
            "status": {"$in": ["Pending", "pending", "Connected", "Accepted"]},
        }).to_list(length=500)
        for ar in alt_reqs:
            excluded_ids.add(ar.get("senderId"))
            excluded_ids.add(ar.get("recipientId"))

        # Fetch viewing user's profile for matching
        viewer_profile = await self.profiles.find_one({"userId": user_id}) or {}
        viewer_skills = {s.lower() for s in viewer_profile.get("skills", [])}
        viewer_company = (viewer_profile.get("company") or "").lower()

        # Fetch candidate profiles not in excluded_ids
        cand_cursor = self.profiles.find({"userId": {"$nin": list(excluded_ids)}})
        cand_profiles = await cand_cursor.to_list(length=100)

        # Also check users collection if profiles are sparse
        if len(cand_profiles) < limit:
            cand_user_cursor = self.users.find({"_id": {"$nin": list(excluded_ids)}, "isActive": {"$ne": False}})
            extra_users = await cand_user_cursor.to_list(length=50)
            existing_uids = {p.get("userId") for p in cand_profiles}
            for u in extra_users:
                uid = str(u.get("id") or u.get("_id"))
                if uid not in existing_uids and uid not in excluded_ids:
                    cand_profiles.append({"userId": uid, "name": u.get("name"), "skills": []})

        scored_candidates = []
        for prof in cand_profiles:
            cid = prof.get("userId") or str(prof.get("_id"))
            if not cid:
                continue

            # Shared skills score
            c_skills = {s.lower() for s in prof.get("skills", [])}
            shared_skills_count = len(viewer_skills.intersection(c_skills))

            # Shared company score
            c_company = (prof.get("company") or "").lower()
            company_match = 1 if viewer_company and c_company and viewer_company == c_company else 0

            # Mutual connections
            mutual_count, _ = await self.get_mutual_connections(user_id, cid)

            total_score = (shared_skills_count * 3) + (company_match * 5) + (mutual_count * 2)
            scored_candidates.append((total_score, cid, prof))

        # Sort descending by recommendation score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        results = []
        for _, cid, prof in scored_candidates[:limit]:
            results.append(await self.build_network_user(cid, viewing_user_id=user_id, preloaded_profile=prof))
        return results

    async def get_network_users(
        self,
        viewing_user_id: Optional[str],
        search: Optional[str] = None,
        company: Optional[str] = None,
        skills: Optional[str] = None,
        role: Optional[str] = None,
        location: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[NetworkUser]:
        """Fetch directory of network users with dynamic relationship states."""
        query_filter: Dict[str, Any] = {}
        if viewing_user_id:
            query_filter["userId"] = {"$ne": viewing_user_id}

        if role and role.lower() != "all":
            role_users = await self.users.find({"role": role, "isActive": {"$ne": False}}, {"_id": 1, "id": 1}).to_list(length=1000)
            role_uids = []
            for ru in role_users:
                ruid = str(ru.get("id") or ru["_id"])
                if not viewing_user_id or ruid != viewing_user_id:
                    role_uids.append(ruid)
            query_filter["userId"] = {"$in": role_uids}

        if company and company.lower() != "all":
            query_filter["company"] = {"$regex": re.escape(company), "$options": "i"}

        if skills and skills.lower() != "all":
            query_filter["skills"] = {"$regex": re.escape(skills), "$options": "i"}

        if location and location.lower() != "all":
            query_filter["location"] = {"$regex": re.escape(location), "$options": "i"}

        if search:
            safe_s = re.escape(search)
            query_filter["$or"] = [
                {"name": {"$regex": safe_s, "$options": "i"}},
                {"headline": {"$regex": safe_s, "$options": "i"}},
                {"company": {"$regex": safe_s, "$options": "i"}},
                {"skills": {"$regex": safe_s, "$options": "i"}},
                {"location": {"$regex": safe_s, "$options": "i"}},
            ]

        cursor = self.profiles.find(query_filter).skip(skip).limit(limit)
        profiles = await cursor.to_list(length=limit)

        # If no profiles matched, query users collection as fallback
        if not profiles and not skills and not company and not location:
            u_filter: Dict[str, Any] = {"isActive": {"$ne": False}}
            if viewing_user_id:
                u_filter["_id"] = {"$ne": viewing_user_id}
            if role and role.lower() != "all":
                u_filter["role"] = role
            if search:
                safe_s = re.escape(search)
                u_filter["$or"] = [
                    {"name": {"$regex": safe_s, "$options": "i"}},
                    {"email": {"$regex": safe_s, "$options": "i"}},
                ]
            users_cursor = self.users.find(u_filter).skip(skip).limit(limit)
            users_docs = await users_cursor.to_list(length=limit)
            profiles = [{"userId": str(u.get("id") or u["_id"]), "name": u.get("name")} for u in users_docs]

        results = []
        for prof in profiles:
            target_id = prof.get("userId") or str(prof.get("_id"))
            if target_id:
                results.append(await self.build_network_user(target_id, viewing_user_id=viewing_user_id, preloaded_profile=prof))
        return results
