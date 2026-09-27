import re
import uuid
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.connection import NetworkUser
from app.services.notification_service import NotificationService
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


def resolve_user_display_name(doc: Optional[Dict[str, Any]]) -> str:
    """Resolve human-readable display name from user/profile doc or email."""
    if not doc:
        return "Engineering Peer"
    raw_name = doc.get("name")
    if isinstance(raw_name, str) and raw_name.strip() and raw_name.strip().lower() not in ("engineering peer", "careerx engineer", "none"):
        return raw_name.strip()
    email = doc.get("email")
    if isinstance(email, str) and "@" in email:
        handle = email.split("@")[0]
        cleaned = re.sub(r"[._-]+", " ", handle).strip()
        if cleaned:
            return cleaned.title()
    return "Engineering Peer"


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
        sender_name = (
            resolve_user_display_name(sender_prof)
            if sender_prof.get("name")
            else resolve_user_display_name(sender_user)
        )
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
            peer_id=receiver_id,
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

    async def build_network_users_batch(
        self,
        targets: List[Dict[str, Any]],
        viewing_user_id: Optional[str] = None,
    ) -> List[NetworkUser]:
        """Batch hydrate complete NetworkUser objects with dynamic relationship states in O(1) DB queries."""
        if not targets:
            return []

        # 1. Collect target user IDs
        target_ids: List[str] = []
        for p in targets:
            tid = p.get("userId") or str(p.get("id") or p.get("_id") or "")
            if tid and tid not in target_ids:
                target_ids.append(tid)

        if not target_ids:
            return []

        # 2. Resolve missing names in batch from users collection
        missing_name_ids = [
            tid for p in targets
            if not p.get("name") and (tid := (p.get("userId") or str(p.get("id") or p.get("_id") or "")))
        ]
        name_map: Dict[str, str] = {}
        if missing_name_ids:
            obj_ids = []
            str_ids = []
            for mid in missing_name_ids:
                str_ids.append(mid)
                try:
                    obj_ids.append(ObjectId(mid))
                except Exception:
                    pass
            u_docs = await self.users.find({"$or": [{"_id": {"$in": obj_ids}}, {"id": {"$in": str_ids}}]}).to_list(length=len(missing_name_ids))
            for u in u_docs:
                uid = str(u.get("id") or u["_id"])
                if u.get("name"):
                    name_map[uid] = u["name"]

        # 3. If authenticated viewer, batch fetch connection docs, requests, follows, and mutuals
        conn_by_target: Dict[str, Dict[str, Any]] = {}
        req_by_target: Dict[str, Dict[str, Any]] = {}
        followed_target_ids: Set[str] = set()
        mutual_by_target: Dict[str, Set[str]] = defaultdict(set)
        mutual_names_map: Dict[str, str] = {}

        if viewing_user_id:
            viewer_conn_ids = await self.get_user_connected_ids(viewing_user_id)

            # Connections between viewer and targets
            c_docs = await self.collection.find({
                "$or": [
                    {"requesterId": viewing_user_id, "receiverId": {"$in": target_ids}},
                    {"receiverId": viewing_user_id, "requesterId": {"$in": target_ids}},
                ]
            }).to_list(length=len(target_ids) * 2)
            for cd in c_docs:
                other = cd.get("receiverId") if cd.get("requesterId") == viewing_user_id else cd.get("requesterId")
                if other:
                    conn_by_target[other] = cd

            # Connection requests between viewer and targets
            r_docs = await self.db["connection_requests"].find({
                "$or": [
                    {"senderId": viewing_user_id, "recipientId": {"$in": target_ids}},
                    {"recipientId": viewing_user_id, "senderId": {"$in": target_ids}},
                ]
            }).to_list(length=len(target_ids) * 2)
            for rd in r_docs:
                other = rd.get("recipientId") if rd.get("senderId") == viewing_user_id else rd.get("senderId")
                if other:
                    req_by_target[other] = rd

            # Follows between viewer and targets
            f_docs = await self.follows.find({
                "followerId": viewing_user_id,
                "targetUserId": {"$in": target_ids},
            }).to_list(length=len(target_ids))
            followed_target_ids = {fd["targetUserId"] for fd in f_docs if fd.get("targetUserId")}

            # Mutual connections (only possible if viewer has confirmed connections)
            if viewer_conn_ids:
                m_cursor = self.collection.find({
                    "status": {"$in": ["Connected", "connected"]},
                    "$or": [
                        {"requesterId": {"$in": list(viewer_conn_ids)}, "receiverId": {"$in": target_ids}},
                        {"receiverId": {"$in": list(viewer_conn_ids)}, "requesterId": {"$in": target_ids}},
                    ]
                })
                m_docs = await m_cursor.to_list(length=500)
                for md in m_docs:
                    req_id = md.get("requesterId")
                    rec_id = md.get("receiverId")
                    if req_id in target_ids and rec_id in viewer_conn_ids and req_id != viewing_user_id:
                        mutual_by_target[req_id].add(rec_id)
                    if rec_id in target_ids and req_id in viewer_conn_ids and rec_id != viewing_user_id:
                        mutual_by_target[rec_id].add(req_id)

                sample_mutual_ids: Set[str] = set()
                for m_set in mutual_by_target.values():
                    for mid in list(m_set)[:3]:
                        sample_mutual_ids.add(mid)

                if sample_mutual_ids:
                    mp_docs = await self.profiles.find({"userId": {"$in": list(sample_mutual_ids)}}).to_list(length=len(sample_mutual_ids))
                    for mp in mp_docs:
                        if mp.get("name"):
                            mutual_names_map[mp["userId"]] = mp["name"]
                    missing_mutual_names = sample_mutual_ids - set(mutual_names_map.keys())
                    if missing_mutual_names:
                        m_obj_ids = []
                        m_str_ids = []
                        for mid in missing_mutual_names:
                            m_str_ids.append(mid)
                            try:
                                m_obj_ids.append(ObjectId(mid))
                            except Exception:
                                pass
                        mu_docs = await self.users.find({"$or": [{"_id": {"$in": m_obj_ids}}, {"id": {"$in": m_str_ids}}]}).to_list(length=len(missing_mutual_names))
                        for mu in mu_docs:
                            uid = str(mu.get("id") or mu["_id"])
                            if mu.get("name"):
                                mutual_names_map[uid] = mu["name"]

        # 4. Construct NetworkUser instances
        results: List[NetworkUser] = []
        for prof in targets:
            tid = prof.get("userId") or str(prof.get("id") or prof.get("_id") or "")
            if not tid:
                continue

            raw_name = prof.get("name") or name_map.get(tid)
            if not raw_name or (isinstance(raw_name, str) and raw_name.strip().lower() in ("engineering peer", "careerx engineer", "none")):
                raw_name = resolve_user_display_name(prof) or name_map.get(tid)
            name_str = raw_name if isinstance(raw_name, str) and raw_name.strip() else "Engineering Peer"
            headline = prof.get("headline") or "Software Engineer"
            company = prof.get("company") or "Technology"
            location = prof.get("location") or "Remote"
            skills = prof.get("skills") or []
            parts = [p for p in name_str.split() if p]
            avatar_initials = prof.get("avatarInitials") or ("".join([p[0].upper() for p in parts[:2]]) if parts else "CX")
            avatar_gradient = prof.get("avatarGradient") or "from-brand-600 to-indigo-800"

            if not viewing_user_id or viewing_user_id == tid:
                conn_state = "Connect"
                is_incoming = False
                req_date = None
                conn_date = None
                note_val = None
                req_id_val = None
                is_fol = False
                m_count = 0
                m_names = []
            else:
                is_fol = tid in followed_target_ids
                m_set = mutual_by_target.get(tid, set())
                m_count = len(m_set)
                m_names = [mutual_names_map.get(mid, "Engineer") for mid in list(m_set)[:3]]

                cd = conn_by_target.get(tid)
                rd = req_by_target.get(tid)

                if cd:
                    st = cd.get("status", "Connect")
                    req_id_val = str(cd.get("id") or cd.get("_id", ""))
                    note_val = cd.get("note")
                    if st in ("Connected", "connected", "Accepted", "accepted"):
                        conn_state = "Connected"
                        is_incoming = False
                        req_date = cd.get("requestDate")
                        conn_date = cd.get("connectedDate") or cd.get("updatedAt")
                    elif st in ("Pending", "pending"):
                        conn_state = "Pending"
                        is_incoming = (cd.get("receiverId") == viewing_user_id)
                        req_date = cd.get("requestDate")
                        conn_date = None
                    else:
                        conn_state = "Connect"
                        is_incoming = False
                        req_date = None
                        conn_date = None
                elif rd:
                    st = rd.get("status", "Connect")
                    req_id_val = str(rd.get("id") or rd.get("_id", ""))
                    note_val = rd.get("note")
                    if st in ("Pending", "pending"):
                        conn_state = "Pending"
                        is_incoming = (rd.get("recipientId") == viewing_user_id)
                        req_date = rd.get("requestDate") or rd.get("createdAt")
                        conn_date = None
                    elif st in ("Connected", "connected", "Accepted", "accepted"):
                        conn_state = "Connected"
                        is_incoming = False
                        req_date = rd.get("requestDate")
                        conn_date = rd.get("updatedAt")
                    else:
                        conn_state = "Connect"
                        is_incoming = False
                        req_date = None
                        conn_date = None
                else:
                    conn_state = "Connect"
                    is_incoming = False
                    req_date = None
                    conn_date = None
                    note_val = None
                    req_id_val = None

            results.append(NetworkUser(
                id=tid,
                name=name_str,
                headline=headline,
                avatarInitials=avatar_initials,
                avatarGradient=avatar_gradient,
                company=company,
                location=location,
                skills=skills,
                mutualCount=m_count,
                mutualNames=m_names,
                connectionState=conn_state,
                isFollowing=is_fol,
                isIncomingRequest=is_incoming,
                requestDate=req_date,
                connectedDate=conn_date,
                note=note_val,
                requestId=req_id_val,
            ))

        return results

    async def build_network_user(
        self,
        target_id: str,
        viewing_user_id: Optional[str] = None,
        preloaded_profile: Optional[Dict[str, Any]] = None,
    ) -> NetworkUser:
        """Hydrate complete NetworkUser object with dynamic relationship states."""
        target = preloaded_profile or {"userId": target_id}
        if "userId" not in target and "id" not in target and "_id" not in target:
            target["userId"] = target_id
        res = await self.build_network_users_batch([target], viewing_user_id=viewing_user_id)
        if res:
            return res[0]
        return NetworkUser(id=target_id, name="Engineering Peer", headline="Software Engineer")

    async def get_connections(self, user_id: str) -> List[NetworkUser]:
        """Fetch all confirmed connections for user."""
        connected_ids = await self.get_user_connected_ids(user_id)
        if not connected_ids:
            return []
        profs = await self.profiles.find({"userId": {"$in": list(connected_ids)}}).to_list(length=len(connected_ids))
        existing_uids = {p.get("userId") for p in profs}
        missing_ids = [uid for uid in connected_ids if uid not in existing_uids]
        if missing_ids:
            obj_ids = []
            for mid in missing_ids:
                try:
                    obj_ids.append(ObjectId(mid))
                except Exception:
                    pass
            u_docs = await self.users.find({"$or": [{"_id": {"$in": obj_ids}}, {"id": {"$in": missing_ids}}]}).to_list(length=len(missing_ids))
            for u in u_docs:
                resolved_id = str(u.get("id") or u["_id"])
                disp_name = resolve_user_display_name(u)
                profs.append({
                    "userId": resolved_id,
                    "name": disp_name,
                    "email": u.get("email"),
                    "headline": u.get("headline") or ("Software Engineer" if u.get("role") == "seeker" else "Technical Talent Partner"),
                    "company": u.get("company") or "CareerX Network",
                    "location": u.get("location") or "Remote",
                    "skills": u.get("skills") or ["React", "TypeScript", "Python"],
                })
        return await self.build_network_users_batch(profs, viewing_user_id=user_id)

    async def get_incoming_requests(self, user_id: str) -> List[NetworkUser]:
        """Fetch incoming pending connection requests for user."""
        cursor = self.collection.find({"receiverId": user_id, "status": {"$in": ["Pending", "pending"]}})
        docs = await cursor.to_list(length=100)
        req_cursor = self.db["connection_requests"].find({"recipientId": user_id, "status": {"$in": ["Pending", "pending"]}})
        req_docs = await req_cursor.to_list(length=100)

        sender_map: Dict[str, Dict[str, Any]] = {}
        for d in docs:
            sid = d.get("requesterId")
            if sid and sid not in sender_map:
                sender_map[sid] = d
        for rd in req_docs:
            sid = rd.get("senderId")
            if sid and sid not in sender_map:
                sender_map[sid] = rd

        if not sender_map:
            return []

        sender_ids = list(sender_map.keys())
        profs = await self.profiles.find({"userId": {"$in": sender_ids}}).to_list(length=len(sender_ids))
        existing_uids = {p.get("userId") for p in profs}
        missing_ids = [sid for sid in sender_ids if sid not in existing_uids]
        if missing_ids:
            obj_ids = []
            for mid in missing_ids:
                try:
                    obj_ids.append(ObjectId(mid))
                except Exception:
                    pass
            u_docs = await self.users.find({"$or": [{"_id": {"$in": obj_ids}}, {"id": {"$in": missing_ids}}]}).to_list(length=len(missing_ids))
            for u in u_docs:
                resolved_id = str(u.get("id") or u["_id"])
                disp_name = resolve_user_display_name(u)
                profs.append({
                    "userId": resolved_id,
                    "name": disp_name,
                    "email": u.get("email"),
                    "headline": u.get("headline") or ("Software Engineer" if u.get("role") == "seeker" else "Technical Talent Partner"),
                    "company": u.get("company") or "CareerX Network",
                    "location": u.get("location") or "Remote",
                    "skills": u.get("skills") or ["React", "TypeScript", "Python"],
                })

        users_batch = await self.build_network_users_batch(profs, viewing_user_id=user_id)
        for u in users_batch:
            req_info = sender_map.get(u.id, {})
            u.requestId = str(req_info.get("id") or req_info.get("_id", ""))
            u.note = req_info.get("note")
            u.requestDate = req_info.get("requestDate") or req_info.get("createdAt")
            u.createdAt = req_info.get("createdAt") or req_info.get("requestDate")
            u.updatedAt = req_info.get("updatedAt")
            u.isIncomingRequest = True
            u.senderId = u.id
            u.recipientId = user_id
            u.status = "pending"
            u.connectionState = "Pending"
        return users_batch

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

        viewer_profile = await self.profiles.find_one({"userId": user_id}) or {}
        viewer_skills = {s.lower() for s in viewer_profile.get("skills", [])}
        viewer_company = (viewer_profile.get("company") or "").lower()

        cand_cursor = self.profiles.find({"userId": {"$nin": list(excluded_ids)}})
        cand_profiles = await cand_cursor.to_list(length=100)

        if len(cand_profiles) < limit:
            cand_user_cursor = self.users.find({"_id": {"$nin": list(excluded_ids)}, "isActive": {"$ne": False}})
            extra_users = await cand_user_cursor.to_list(length=50)
            existing_uids = {p.get("userId") for p in cand_profiles}
            for u in extra_users:
                uid = str(u.get("id") or u.get("_id"))
                if uid not in existing_uids and uid not in excluded_ids:
                    cand_profiles.append({"userId": uid, "name": u.get("name"), "skills": []})

        cand_ids = [p.get("userId") or str(p.get("_id")) for p in cand_profiles if p.get("userId") or p.get("_id")]

        # Bulk compute mutual counts for scoring in a single query
        viewer_conn_ids = await self.get_user_connected_ids(user_id)
        mutual_counts: Dict[str, int] = defaultdict(int)
        if viewer_conn_ids and cand_ids:
            m_cursor = self.collection.find({
                "status": {"$in": ["Connected", "connected"]},
                "$or": [
                    {"requesterId": {"$in": list(viewer_conn_ids)}, "receiverId": {"$in": cand_ids}},
                    {"receiverId": {"$in": list(viewer_conn_ids)}, "requesterId": {"$in": cand_ids}},
                ]
            })
            m_docs = await m_cursor.to_list(length=500)
            for md in m_docs:
                r1, r2 = md.get("requesterId"), md.get("receiverId")
                if r1 in cand_ids and r2 in viewer_conn_ids:
                    mutual_counts[r1] += 1
                if r2 in cand_ids and r1 in viewer_conn_ids:
                    mutual_counts[r2] += 1

        scored_candidates = []
        for prof in cand_profiles:
            cid = prof.get("userId") or str(prof.get("_id"))
            if not cid:
                continue

            c_skills = {s.lower() for s in prof.get("skills", [])}
            shared_skills_count = len(viewer_skills.intersection(c_skills))
            c_company = (prof.get("company") or "").lower()
            company_match = 1 if viewer_company and c_company and viewer_company == c_company else 0
            mutual_count = mutual_counts.get(cid, 0)

            total_score = (shared_skills_count * 3) + (company_match * 5) + (mutual_count * 2)
            scored_candidates.append((total_score, cid, prof))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        top_profiles = [prof for _, cid, prof in scored_candidates[:limit]]
        return await self.build_network_users_batch(top_profiles, viewing_user_id=user_id)

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

        # If profiles are fewer than limit and no specific profile filters are present, supplement with active users
        if len(profiles) < limit and not skills and not company and not location:
            existing_uids = {p.get("userId") for p in profiles}
            if viewing_user_id:
                existing_uids.add(viewing_user_id)
            u_filter: Dict[str, Any] = {"isActive": {"$ne": False}}
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
            for u in users_docs:
                uid = str(u.get("id") or u["_id"])
                if uid not in existing_uids:
                    existing_uids.add(uid)
                    profiles.append({
                        "userId": uid,
                        "name": u.get("name"),
                        "company": u.get("company"),
                        "location": "Remote",
                        "headline": "Software Engineer" if u.get("role") == "seeker" else "Talent Partner",
                        "skills": [],
                    })
                if len(profiles) >= limit:
                    break

        return await self.build_network_users_batch(profiles[:limit], viewing_user_id=viewing_user_id)
