import uuid
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.utils.helpers import serialize_mongo_doc, serialize_mongo_docs, utc_now_iso


class NoteRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "notes")

    async def create_note(
        self,
        application_id: str,
        user_id: str,
        content: str,
    ) -> Dict[str, Any]:
        """Create a new note attached to an application."""
        note_id = str(uuid.uuid4())
        now = utc_now_iso()
        doc = {
            "id": note_id,
            "applicationId": application_id,
            "userId": user_id,
            "content": content,
            "createdAt": now,
            "updatedAt": now,
        }
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_mongo_doc(doc)  # type: ignore

    async def get_notes_for_application(
        self,
        application_id: str,
    ) -> List[Dict[str, Any]]:
        """Retrieve all notes for an application sorted chronologically descending."""
        query = {
            "$or": [
                {"applicationId": application_id},
                {"application_id": application_id},
            ]
        }
        docs = await self.collection.find(query).sort("createdAt", -1).to_list(length=200)
        return serialize_mongo_docs(docs)

    async def delete_note(self, note_id: str, user_id: str) -> bool:
        """Delete a note ensuring user ownership."""
        id_q = self._build_id_query(note_id)
        res = await self.collection.delete_one({"$and": [id_q, {"userId": user_id}]})
        return res.deleted_count > 0
