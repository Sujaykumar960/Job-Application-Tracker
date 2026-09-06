import re
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.connection import NetworkUser
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

        existing = await self.collection.find_one({
            "$or": [
                {"requesterId": requester_id, "receiverId": receiver_id},
                {"requesterId": receiver_id, "receiverId": requester_id},
            ]
        })

        if existing:
            current_status = existing.get("status")
            if current_status == "Connected":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Users are already connected.",
                )
            if current_status == "Pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A connection request is already pending between these users.",
                )

            # Re-activate declined request as fresh pending request
            update_data = {
                "requesterId": requester_id,
                "receiverId": receiver_id,
                "status": "Pending",
                "note": note,
                "requestDate": utc_now_iso(),
                "updatedAt": utc_now_iso(),
            }
            res = await self.collection.find_one_and_update(
                {"_id": existing["_id"]},
                {"$set": update_data},
                return_document=True,
            )
            return serialize_mongo_doc(res)  # type: ignore

        new_doc = {
            "requesterId": requester_id,
            "receiverId": receiver_id,
            "status": "Pending",
            "note": note,
            "requestDate": utc_now_iso(),
            "createdAt": utc_now_iso(),
        }
        return await self.create(new_doc)

    async def accept_connection_request(self, request_id: str, receiver_id: str) -> Dict[str, Any]:
        """Accept an incoming connection request strictly by the recipient."""
        id_q = self._build_id_query(request_id)
        request = await self.collection.find_one(id_q)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection request with ID '{request_id}' not found.",
            )

        if request.get("receiverId") != receiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. Only the recipient can accept this connection request.",
            )

        now = utc_now_iso()
        res = await self.collection.find_one_and_update(
            id_q,
            {"$set": {"status": "Connected", "connectedDate": now, "updatedAt": now}},
            return_document=True,
        )
        return serialize_mongo_doc(res)  # type: ignore

    async def reject_connection_request(self, request_id: str, receiver_id: str) -> Dict[str, Any]:
        """Reject an incoming connection request strictly by the recipient."""
        id_q = self._build_id_query(request_id)
        request = await self.collection.find_one(id_q)
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection request with ID '{request_id}' not found.",
            )

        if request.get("receiverId") != receiver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. Only the recipient can reject this connection request.",
            )

        now = utc_now_iso()
        res = await self.collection.find_one_and_update(
            id_q,
            {"$set": {"status": "Declined", "updatedAt": now}},
            return_document=True,
        )
        return serialize_mongo_doc(res)  # type: ignore

    async def remove_connection(self, user_a: str, user_b: str) -> bool:
        """Remove/disconnect 1st-degree connection between two users."""
        res = await self.collection.delete_one({
            "$or": [
                {"requesterId": user_a, "receiverId": user_b, "status": "Connected"},
                {"requesterId": user_b, "receiverId": user_a, "status": "Connected"},
            ]
        })
        return res.deleted_count > 0

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
        cursor = self.collection.find({"receiverId": user_id, "status": "Pending"})
        docs = await cursor.to_list(length=100)
        results = []
        for d in docs:
            sender_id = d.get("requesterId")
            if sender_id:
                u = await self.build_network_user(sender_id, viewing_user_id=user_id)
                u.requestId = str(d.get("id") or d.get("_id", ""))
                u.note = d.get("note")
                u.requestDate = d.get("requestDate")
                u.isIncomingRequest = True
                results.append(u)
        return results

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
        limit: int = 50,
        skip: int = 0,
    ) -> List[NetworkUser]:
        """Fetch directory of network users with dynamic relationship states."""
        query_filter: Dict[str, Any] = {}
        if viewing_user_id:
            query_filter["userId"] = {"$ne": viewing_user_id}

        if company and company.lower() != "all":
            query_filter["company"] = {"$regex": re.escape(company), "$options": "i"}

        if skills and skills.lower() != "all":
            query_filter["skills"] = {"$regex": re.escape(skills), "$options": "i"}

        if search:
            safe_s = re.escape(search)
            query_filter["$or"] = [
                {"name": {"$regex": safe_s, "$options": "i"}},
                {"headline": {"$regex": safe_s, "$options": "i"}},
                {"company": {"$regex": safe_s, "$options": "i"}},
                {"skills": {"$in": [search]}},
            ]

        cursor = self.profiles.find(query_filter).skip(skip).limit(limit)
        profiles = await cursor.to_list(length=limit)

        # If no profiles matched, query users collection as fallback
        if not profiles and not skills and not company:
            u_filter: Dict[str, Any] = {"isActive": {"$ne": False}}
            if viewing_user_id:
                u_filter["_id"] = {"$ne": viewing_user_id}
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
