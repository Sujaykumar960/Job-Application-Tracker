import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.repositories.base import BaseRepository
from app.schemas.company import CompanyFollowResponse, CompanyProfile
from app.schemas.job import JobItem

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("", response_model=List[CompanyProfile])
async def get_companies(
    query: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch partner technology companies with optional query search."""
    repo = BaseRepository(db, "companies")
    filter_q: Dict[str, Any] = {}
    if query:
        safe_q = re.escape(query)
        filter_q["$or"] = [
            {"name": {"$regex": safe_q, "$options": "i"}},
            {"industry": {"$regex": safe_q, "$options": "i"}},
            {"techStack": {"$in": [query]}},
        ]

    docs = await repo.find_many(filter_q)
    return docs


@router.get("/{slug_or_id}", response_model=CompanyProfile)
async def get_company_by_slug_or_id(
    slug_or_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch company dossier by slug or ID."""
    repo = BaseRepository(db, "companies")
    doc = await repo.collection.find_one({
        "$or": [
            {"slug": slug_or_id},
            {"id": slug_or_id},
        ]
    })
    if not doc:
        doc = await repo.get_by_id(slug_or_id)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{slug_or_id}' not found.",
        )
    from app.utils.helpers import serialize_mongo_doc
    return serialize_mongo_doc(doc)


@router.get("/{company_id}/jobs", response_model=List[JobItem])
async def get_company_jobs(
    company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch open engineering jobs for a company."""
    repo = BaseRepository(db, "jobs")
    docs = await repo.find_many({"companyId": company_id})
    return docs


@router.post("/{company_id}/follow", response_model=CompanyFollowResponse)
async def toggle_follow_company(
    company_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggle follow/unfollow status for a company."""
    repo = BaseRepository(db, "companies")
    comp = await repo.get_by_id(company_id)
    followers = comp.get("followers", []) if comp else []

    uid = user["id"] if user else "usr_guest"
    if uid in followers:
        followers.remove(uid)
        is_following = False
    else:
        followers.append(uid)
        is_following = True

    if comp:
        await repo.update(company_id, {"followers": followers, "followersCount": len(followers)})

    return CompanyFollowResponse(isFollowing=is_following, followersCount=len(followers))
