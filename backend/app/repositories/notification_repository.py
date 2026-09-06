from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.notification import NotificationFilterQuery
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class NotificationRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "notifications")

    async def get_user_notifications(
        self,
        user_id: str,
        filter_query: Optional[NotificationFilterQuery] = None,
    ) -> List[Dict[str, Any]]:
        filter_q: Dict[str, Any] = {"userId": user_id}

        if filter_query:
            if filter_query.category and filter_query.category.lower() != "all":
                filter_q["category"] = filter_query.category
            if filter_query.isRead is not None:
                filter_q["isRead"] = filter_query.isRead
            if filter_query.priority and filter_query.priority.lower() != "all":
                filter_q["priority"] = filter_query.priority

        limit = filter_query.limit if filter_query else 50
        skip = filter_query.skip if filter_query else 0
        if filter_query and filter_query.page is not None and filter_query.page > 0:
            skip = (filter_query.page - 1) * limit

        return await self.find_many(filter_q, sort=[("createdAt", -1)], limit=limit, skip=skip)

    async def get_notification_by_id(self, notification_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single notification strictly ensuring ownership."""
        id_q = self._build_id_query(notification_id)
        doc = await self.collection.find_one({"$and": [id_q, {"userId": user_id}]})
        return serialize_mongo_doc(doc)

    async def get_unread_count(self, user_id: str) -> int:
        """Count unread notifications for a user."""
        return await self.collection.count_documents({"userId": user_id, "isRead": False})

    async def mark_as_read(self, notification_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Mark notification as read strictly ensuring ownership."""
        id_q = self._build_id_query(notification_id)
        res = await self.collection.find_one_and_update(
            {"$and": [id_q, {"userId": user_id}]},
            {"$set": {"isRead": True, "updatedAt": utc_now_iso()}},
            return_document=True,
        )
        return serialize_mongo_doc(res)

    async def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        res = await self.collection.update_many(
            {"userId": user_id, "isRead": False},
            {"$set": {"isRead": True, "updatedAt": utc_now_iso()}},
        )
        return res.modified_count

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete notification strictly ensuring ownership."""
        id_q = self._build_id_query(notification_id)
        res = await self.collection.delete_one({"$and": [id_q, {"userId": user_id}]})
        return res.deleted_count > 0

    async def clear_read(self, user_id: str) -> int:
        """Delete all read notifications for a user."""
        res = await self.collection.delete_many({"userId": user_id, "isRead": True})
        return res.deleted_count

    async def create_deduped_notification(
        self,
        doc_data: Dict[str, Any],
        dedup_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create notification with idempotency check on dedupKey to prevent duplicates."""
        user_id = doc_data["userId"]
        if dedup_key:
            existing = await self.collection.find_one({"userId": user_id, "dedupKey": dedup_key})
            if existing:
                return serialize_mongo_doc(existing)  # type: ignore
            doc_data["dedupKey"] = dedup_key

        if not doc_data.get("createdAt"):
            doc_data["createdAt"] = utc_now_iso()
        if "isRead" not in doc_data:
            doc_data["isRead"] = False
        if not doc_data.get("timestamp"):
            doc_data["timestamp"] = "Just now"
        if not doc_data.get("time"):
            doc_data["time"] = doc_data["timestamp"]

        return await self.create(doc_data)
