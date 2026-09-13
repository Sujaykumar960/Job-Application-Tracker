from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")
        self.profiles_collection = db["profiles"]

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one({"email": email.strip().lower()})
        return serialize_mongo_doc(doc)

    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.profiles_collection.find_one({"userId": user_id})
        return serialize_mongo_doc(doc)

    async def create_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        data = dict(profile_data)
        if "createdAt" not in data:
            data["createdAt"] = utc_now_iso()
        res = await self.profiles_collection.insert_one(data)
        data["_id"] = res.inserted_id
        return serialize_mongo_doc(data)  # type: ignore

    async def update_profile(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        clean_data = dict(update_data)
        clean_data["updatedAt"] = utc_now_iso()
        res = await self.profiles_collection.find_one_and_update(
            {"userId": user_id},
            {"$set": clean_data},
            upsert=True,
            return_document=True,
        )
        return serialize_mongo_doc(res)

    async def get_public_profile(self, user_id: str, viewing_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fetch sanitized public profile with dynamic relationship status."""
        user_doc = await self.get_by_id(user_id)
        if not user_doc:
            return None

        profile_doc = await self.get_profile(user_id) or {}

        connection_status = "none"
        request_id = None
        if viewing_user_id:
            if viewing_user_id == user_id:
                connection_status = "self"
            else:
                conn = await self.db["connections"].find_one({
                    "$or": [
                        {"requesterId": viewing_user_id, "receiverId": user_id},
                        {"requesterId": user_id, "receiverId": viewing_user_id},
                    ]
                })
                if conn:
                    request_id = str(conn.get("id") or conn.get("_id", ""))
                    status_val = conn.get("status")
                    if status_val in ("Connected", "connected", "Accepted", "accepted"):
                        connection_status = "connected"
                    elif status_val in ("Pending", "pending"):
                        if conn.get("requesterId") == viewing_user_id:
                            connection_status = "pending_sent"
                        else:
                            connection_status = "pending_received"
                else:
                    req_alt = await self.db["connection_requests"].find_one({
                        "$or": [
                            {"senderId": viewing_user_id, "recipientId": user_id},
                            {"senderId": user_id, "recipientId": viewing_user_id},
                        ]
                    })
                    if req_alt:
                        request_id = str(req_alt.get("id") or req_alt.get("_id", ""))
                        status_val = req_alt.get("status")
                        if status_val in ("Accepted", "accepted", "Connected", "connected"):
                            connection_status = "connected"
                        elif status_val in ("Pending", "pending"):
                            if req_alt.get("senderId") == viewing_user_id:
                                connection_status = "pending_sent"
                            else:
                                connection_status = "pending_received"

        name = profile_doc.get("name") or user_doc.get("name") or user_doc.get("email", "").split("@")[0].capitalize()
        avatar_initials = profile_doc.get("avatarInitials") or "".join([p[0].upper() for p in name.split()[:2]]) or "CX"

        return {
            "id": user_id,
            "name": name,
            "role": user_doc.get("role", "seeker"),
            "headline": profile_doc.get("headline") or "",
            "bio": profile_doc.get("bio") or "",
            "location": profile_doc.get("location") or "Remote",
            "company": profile_doc.get("company") or user_doc.get("company"),
            "avatarUrl": profile_doc.get("avatarUrl") or profile_doc.get("avatar"),
            "avatarInitials": avatar_initials,
            "avatarGradient": profile_doc.get("avatarGradient") or "from-brand-600 to-indigo-800",
            "skills": profile_doc.get("skills") or [],
            "experiences": profile_doc.get("experiences") or [],
            "education": profile_doc.get("education") or [],
            "projects": profile_doc.get("projects") or [],
            "certifications": profile_doc.get("certifications") or [],
            "websiteUrl": profile_doc.get("websiteUrl") or profile_doc.get("website"),
            "githubUrl": profile_doc.get("githubUrl") or profile_doc.get("github"),
            "linkedinUrl": profile_doc.get("linkedinUrl") or profile_doc.get("linkedin"),
            "connectionStatus": connection_status,
            "requestId": request_id,
            "createdAt": user_doc.get("createdAt") or profile_doc.get("createdAt"),
        }
