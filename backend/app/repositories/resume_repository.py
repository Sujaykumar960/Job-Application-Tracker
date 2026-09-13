import logging
import uuid
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.utils.helpers import serialize_mongo_doc, utc_now_iso

logger = logging.getLogger("careerx.resume_repository")


class ResumeRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "resumes")
        self.analyses = db["resume_analyses"]

    async def create_resume(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new resume document. If marked active, unmark prior active resumes."""
        user_id = doc.get("userId")
        if doc.get("isActive") and user_id:
            await self.collection.update_many(
                {"userId": user_id, "isActive": True},
                {"$set": {"isActive": False, "updatedAt": utc_now_iso()}},
            )
        created = await self.create(doc)
        return created

    async def get_user_resumes(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all resumes owned by user ordered newest first."""
        cursor = self.collection.find({"userId": user_id}).sort("createdAt", -1)
        docs = await cursor.to_list(length=100)
        return [serialize_mongo_doc(d) for d in docs]  # type: ignore

    async def get_resume_by_id(self, resume_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fetch resume document by ID, optionally enforcing user ownership."""
        id_q = self._build_id_query(resume_id)
        if user_id:
            id_q["userId"] = user_id
        doc = await self.collection.find_one(id_q)
        return serialize_mongo_doc(doc) if doc else None

    async def get_active_resume(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch current active resume for user."""
        doc = await self.collection.find_one({"userId": user_id, "isActive": True})
        if not doc:
            # Fallback to most recent resume if none marked active
            doc = await self.collection.find_one({"userId": user_id}, sort=[("createdAt", -1)])
        return serialize_mongo_doc(doc) if doc else None

    async def set_active_resume(self, user_id: str, resume_id: str) -> Optional[Dict[str, Any]]:
        """Set specified resume as active and deactivate all others for this user."""
        target = await self.get_resume_by_id(resume_id, user_id=user_id)
        if not target:
            return None

        now = utc_now_iso()
        # Deactivate all other user resumes
        await self.collection.update_many(
            {"userId": user_id},
            {"$set": {"isActive": False, "updatedAt": now}},
        )

        id_q = self._build_id_query(resume_id)
        updated = await self.collection.find_one_and_update(
            id_q,
            {"$set": {"isActive": True, "updatedAt": now}},
            return_document=True,
        )
        return serialize_mongo_doc(updated) if updated else None

    async def update_resume_score(self, resume_id: str, ats_score: int) -> None:
        """Update ATS score on resume document."""
        id_q = self._build_id_query(resume_id)
        await self.collection.update_one(
            id_q,
            {"$set": {"atsScore": ats_score, "updatedAt": utc_now_iso()}},
        )

    async def delete_resume(self, user_id: str, resume_id: str) -> Optional[Dict[str, Any]]:
        """Delete resume document and all associated analyses."""
        target = await self.get_resume_by_id(resume_id, user_id=user_id)
        if not target:
            return None

        # Delete resume document
        id_q = self._build_id_query(resume_id)
        await self.collection.delete_one(id_q)

        # Cascade delete analyses
        await self.analyses.delete_many({"resumeId": resume_id})

        # If deleted resume was active, set next newest as active
        if target.get("isActive"):
            next_newest = await self.collection.find_one({"userId": user_id}, sort=[("createdAt", -1)])
            if next_newest:
                await self.collection.update_one(
                    {"_id": next_newest["_id"]},
                    {"$set": {"isActive": True, "updatedAt": utc_now_iso()}},
                )

        return target

    async def save_analysis(self, analysis_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Save a new resume analysis record to MongoDB."""
        now = utc_now_iso()
        if "id" not in analysis_doc or not analysis_doc["id"]:
            analysis_doc["id"] = f"ana_{uuid.uuid4().hex[:12]}"
        analysis_doc["createdAt"] = analysis_doc.get("createdAt") or now
        analysis_doc["updatedAt"] = now

        await self.analyses.insert_one(analysis_doc)
        return serialize_mongo_doc(analysis_doc)  # type: ignore

    async def get_latest_analysis(
        self, user_id: str, resume_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieve most recent analysis for a given resume or user."""
        query: Dict[str, Any] = {"userId": user_id}
        if resume_id:
            query["resumeId"] = resume_id

        doc = await self.analyses.find_one(query, sort=[("createdAt", -1)])
        return serialize_mongo_doc(doc) if doc else None
