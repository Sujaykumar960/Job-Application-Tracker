import uuid
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class CalendarRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "calendar_events")

    async def get_user_events(
        self,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch all events where user is owner or participant."""
        query: Dict[str, Any] = {
            "$or": [
                {"userId": user_id},
                {"participants": user_id},
            ]
        }
        if event_type and event_type.lower() != "all":
            query["type"] = event_type
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        elif start_date:
            query["date"] = {"$gte": start_date}
        elif end_date:
            query["date"] = {"$lte": end_date}

        return await self.find_many(
            query,
            sort=[("date", 1), ("time", 1)],
            limit=500,
        )

    async def get_event_by_id(self, event_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single event if user is owner or participant."""
        id_q = self._build_id_query(event_id)
        doc = await self.collection.find_one({
            "$and": [
                id_q,
                {
                    "$or": [
                        {"userId": user_id},
                        {"participants": user_id},
                    ]
                },
            ]
        })
        return serialize_mongo_doc(doc)

    async def get_raw_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Get raw event by id for authorization checks."""
        id_q = self._build_id_query(event_id)
        doc = await self.collection.find_one(id_q)
        return serialize_mongo_doc(doc)

    async def create_event(self, user_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new calendar event owned by user."""
        doc = dict(event_data)
        doc["id"] = f"evt-{uuid.uuid4().hex[:8]}"
        doc["userId"] = user_id
        if "participants" not in doc or doc["participants"] is None:
            doc["participants"] = []
        doc["createdAt"] = utc_now_iso()
        doc["updatedAt"] = None
        await self.collection.insert_one(doc)
        return serialize_mongo_doc(doc)

    async def update_event(
        self,
        event_id: str,
        user_id: str,
        update_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Update event if caller is the owner."""
        id_q = self._build_id_query(event_id)
        existing = await self.collection.find_one(id_q)
        if not existing:
            return None
        if existing.get("userId") != user_id:
            raise PermissionError("Only the event owner can modify this event.")

        payload = {k: v for k, v in update_data.items() if v is not None}
        payload["updatedAt"] = utc_now_iso()

        result = await self.collection.find_one_and_update(
            id_q,
            {"$set": payload},
            return_document=True,
        )
        return serialize_mongo_doc(result)

    async def delete_event(self, event_id: str, user_id: str) -> bool:
        """Delete event if caller is the owner."""
        id_q = self._build_id_query(event_id)
        existing = await self.collection.find_one(id_q)
        if not existing:
            return False
        if existing.get("userId") != user_id:
            raise PermissionError("Only the event owner can delete this event.")

        res = await self.collection.delete_one(id_q)
        return res.deleted_count > 0

    async def count_user_events(self, user_id: str) -> int:
        """Count user events."""
        return await self.collection.count_documents({
            "$or": [
                {"userId": user_id},
                {"participants": user_id},
            ]
        })

    async def sync_all_user_events(self, user_id: str) -> int:
        """Mark user's events as synced with Google Calendar."""
        res = await self.collection.update_many(
            {"$or": [{"userId": user_id}, {"participants": user_id}]},
            {"$set": {"isSyncedWithGoogle": True, "updatedAt": utc_now_iso()}},
        )
        return res.modified_count
