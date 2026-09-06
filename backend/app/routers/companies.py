import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.repositories.base import BaseRepository
from app.schemas.company import (
    CompanyDiscoverRequest,
    CompanyFollowResponse,
    CompanyProfile,
)
from app.schemas.job import JobItem
from app.services.ai_service import AiService
from app.utils.helpers import serialize_mongo_doc

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post("/ai-discover", response_model=List[CompanyProfile])
@router.post("/ai-generate", response_model=List[CompanyProfile])
async def discover_companies_with_ai(
    request: CompanyDiscoverRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Generate real-time company dossiers, tech stacks, and open engineering jobs using Groq LLM."""
    generated = await AiService.generate_companies_with_groq(
        industry=request.industry,
        query=request.query,
        company_name=request.companyName,
        count=request.count or 3,
    )

    repo = BaseRepository(db, "companies")
    jobs_repo = BaseRepository(db, "jobs")

    saved_profiles: List[CompanyProfile] = []
    for comp_data in generated:
        comp_id = comp_data["id"]
        # Save or update company
        existing = await repo.collection.find_one({"$or": [{"id": comp_id}, {"slug": comp_data["slug"]}]})
        if existing:
            await repo.collection.update_one({"_id": existing["_id"]}, {"$set": comp_data})
        else:
            await repo.collection.insert_one(comp_data)

        # Also save jobs to jobs collection
        for job in comp_data.get("jobs", []):
            await jobs_repo.collection.update_one(
                {"id": job["id"]},
                {"$set": job},
                upsert=True,
            )

        saved_profiles.append(CompanyProfile(**comp_data))

    return saved_profiles


@router.get("", response_model=List[CompanyProfile])
async def get_companies(
    query: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch partner technology companies with optional query search."""
    repo = BaseRepository(db, "companies")
    count = await repo.collection.count_documents({})
    if count == 0:
        # Generate initial companies via Groq AI or seed
        try:
            initial_comps = await AiService.generate_companies_with_groq(count=4)
            for c in initial_comps:
                await repo.collection.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
                for job in c.get("jobs", []):
                    await db.jobs.update_one({"id": job["id"]}, {"$set": job}, upsert=True)
        except Exception:
            pass

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
