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
