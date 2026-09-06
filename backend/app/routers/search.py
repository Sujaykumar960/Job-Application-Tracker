from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.schemas.search import UnifiedSearchResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Global Search"])


@router.get("", response_model=UnifiedSearchResponse)
async def search_platform(
    q: str = Query("", description="Search keyword across jobs, people, feed posts, and candidates"),
    type: str = Query("all", description="Category filter: all, jobs, people, posts, candidates"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results per category"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unified search endpoint covering jobs, networking users, feed posts, and recruiter candidates."""
    service = SearchService(db)
    return await service.search_all(q=q, search_type=type, user=user, limit=limit)
