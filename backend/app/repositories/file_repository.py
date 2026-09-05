from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.utils.helpers import utc_now_iso


class FileRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "files")

    async def create_file_metadata(
        self,
        owner_id: str,
        original_filename: str,
        content_type: str,
        size: int,
        storage_key: str,
        purpose: str = "other",
    ) -> Dict[str, Any]:
        doc = {
            "ownerId": owner_id,
            "originalFilename": original_filename,
            "contentType": content_type,
            "size": size,
            "storageKey": storage_key,
            "purpose": purpose,
            "createdAt": utc_now_iso(),
        }
        return await self.create(doc)

    async def get_by_storage_key(self, storage_key: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"storageKey": storage_key})

    async def list_by_owner(self, owner_id: str, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        return await self.find_many({"ownerId": owner_id}, sort=[("createdAt", -1)], limit=limit, skip=skip)
