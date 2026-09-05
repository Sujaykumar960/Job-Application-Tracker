import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db
from app.repositories.base import BaseRepository
from app.schemas.question import CodingProblem

router = APIRouter(prefix="/questions", tags=["Coding Questions"])


@router.get("", response_model=List[CodingProblem])
async def get_questions(
    difficulty: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch coding questions with optional difficulty and tag filters."""
    repo = BaseRepository(db, "questions")
    filter_q: Dict[str, Any] = {}

    if difficulty and difficulty.lower() != "all":
        safe_diff = re.escape(difficulty)
        filter_q["difficulty"] = {"$regex": f"^{safe_diff}$", "$options": "i"}
    if tag and tag.lower() != "all":
        filter_q["tags"] = {"$in": [tag]}

    docs = await repo.find_many(filter_q)
    return docs


@router.get("/{id_or_slug}", response_model=CodingProblem)
async def get_question_by_id_or_slug(
    id_or_slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single coding problem by ID or slug."""
    repo = BaseRepository(db, "questions")
    doc = await repo.collection.find_one({
        "$or": [
            {"slug": id_or_slug},
            {"id": id_or_slug},
        ]
    })
    if not doc:
        # Check standard id query
        doc = await repo.get_by_id(id_or_slug)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding question '{id_or_slug}' not found.",
        )
    from app.utils.helpers import serialize_mongo_doc
    return serialize_mongo_doc(doc)
