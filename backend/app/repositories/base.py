from typing import Any, Dict, List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase

from app.utils.helpers import serialize_mongo_doc, serialize_mongo_docs, utc_now_iso


class BaseRepository:
    """Generic async repository for MongoDB collections."""

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection: AsyncIOMotorCollection = db[collection_name]

    def _build_id_query(self, id_val: Any) -> Dict[str, Any]:
        """Support querying by both ObjectId and custom string id safely."""
        if not id_val:
            return {"id": ""}
        s_id = str(id_val)
        if ObjectId.is_valid(s_id):
            return {"$or": [{"_id": ObjectId(s_id)}, {"id": s_id}]}
        return {"id": s_id}

    async def get_by_id(self, id_val: str) -> Optional[Dict[str, Any]]:
        query = self._build_id_query(id_val)
        doc = await self.collection.find_one(query)
        return serialize_mongo_doc(doc)

    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(filter_query)
        return serialize_mongo_doc(doc)

    async def find_many(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        sort: Optional[List[tuple]] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(filter_query or {})
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)

        docs = await cursor.to_list(length=limit)
        return serialize_mongo_docs(docs)

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        doc = dict(data)
        if "createdAt" not in doc:
            doc["createdAt"] = utc_now_iso()
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo_doc(doc)  # type: ignore

    async def update(self, id_val: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        query = self._build_id_query(id_val)
        clean_update = dict(update_data)
        clean_update["updatedAt"] = utc_now_iso()
        res = await self.collection.find_one_and_update(
            query,
            {"$set": clean_update},
            return_document=True,
        )
        return serialize_mongo_doc(res)

    async def delete(self, id_val: str) -> bool:
        query = self._build_id_query(id_val)
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0
