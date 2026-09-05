import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.application import ApplicationFilterQuery
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class ApplicationRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "applications")

    async def get_user_applications(
        self,
        user_id: str,
        filter_query: Optional[ApplicationFilterQuery] = None,
    ) -> List[Dict[str, Any]]:
        filter_q: Dict[str, Any] = {"userId": user_id}

        if filter_query:
            if filter_query.status and filter_query.status.lower() != "all":
                safe_status = re.escape(filter_query.status)
                filter_q["status"] = {"$regex": f"^{safe_status}$", "$options": "i"}
            if filter_query.priority and filter_query.priority.lower() != "all":
                safe_priority = re.escape(filter_query.priority)
                filter_q["priority"] = {"$regex": f"^{safe_priority}$", "$options": "i"}
            if filter_query.company:
                safe_co = re.escape(filter_query.company)
                filter_q["$or"] = [
                    {"company": {"$regex": safe_co, "$options": "i"}},
                    {"companyName": {"$regex": safe_co, "$options": "i"}},
                ]
            if filter_query.upcoming:
                today = utc_now_iso().split("T")[0]
                filter_q["$or"] = [
                    {"interviewDate": {"$gte": today}},
                    {"deadlineDate": {"$gte": today}},
                    {"deadline": {"$gte": today}},
                ]
            if filter_query.search:
                safe_s = re.escape(filter_query.search)
                filter_q["$or"] = [
                    {"company": {"$regex": safe_s, "$options": "i"}},
                    {"role": {"$regex": safe_s, "$options": "i"}},
                    {"roleTitle": {"$regex": safe_s, "$options": "i"}},
                    {"notes": {"$regex": safe_s, "$options": "i"}},
                    {"tags": {"$in": [filter_query.search]}},
                ]

        limit = filter_query.limit if filter_query else 100
        skip = filter_query.skip if filter_query else 0
        return await self.find_many(filter_q, sort=[("appliedDate", -1)], limit=limit, skip=skip)

    async def get_application_for_user(self, app_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single application strictly ensuring it belongs to the authenticated user."""
        id_q = self._build_id_query(app_id)
        doc = await self.collection.find_one({"$and": [id_q, {"userId": user_id}]})
        return serialize_mongo_doc(doc)

    async def update_application_for_user(
        self,
        app_id: str,
        user_id: str,
        update_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Update an application strictly ensuring user ownership."""
        id_q = self._build_id_query(app_id)
        clean_data = dict(update_data)
        clean_data["updatedAt"] = utc_now_iso()

        res = await self.collection.find_one_and_update(
            {"$and": [id_q, {"userId": user_id}]},
            {"$set": clean_data},
            return_document=True,
        )
        return serialize_mongo_doc(res)

    async def delete_application_for_user(self, app_id: str, user_id: str) -> bool:
        """Delete an application strictly ensuring user ownership."""
        id_q = self._build_id_query(app_id)
        res = await self.collection.delete_one({"$and": [id_q, {"userId": user_id}]})
        return res.deleted_count > 0

    async def get_stats_for_user(self, user_id: str) -> Dict[str, int]:
        """Aggregate application status metrics and upcoming interviews/deadlines for seeker."""
        today = utc_now_iso().split("T")[0]

        total = await self.collection.count_documents({"userId": user_id})
        applied = await self.collection.count_documents({"userId": user_id, "status": "Applied"})
        interviews = await self.collection.count_documents({"userId": user_id, "status": "Interview"})
        offers = await self.collection.count_documents({"userId": user_id, "status": "Offer"})
        rejected = await self.collection.count_documents({"userId": user_id, "status": "Rejected"})

        upcoming_interviews = await self.collection.count_documents({
            "userId": user_id,
            "status": "Interview",
            "$or": [
                {"interviewDate": {"$gte": today}},
                {"interviewDate": {"$ne": None}},
            ],
        })

        upcoming_deadlines = await self.collection.count_documents({
            "userId": user_id,
            "status": {"$in": ["Applied", "Interview"]},
            "$or": [
                {"deadlineDate": {"$gte": today}},
                {"deadline": {"$gte": today}},
            ],
        })

        return {
            "totalApplications": total,
            "applied": applied,
            "interviews": interviews,
            "offers": offers,
            "rejected": rejected,
            "upcomingInterviews": upcoming_interviews,
            "upcomingDeadlines": upcoming_deadlines,
        }
