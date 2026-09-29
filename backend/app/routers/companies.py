import re
from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user, get_write_user, require_role
from app.repositories.base import BaseRepository
from app.schemas.company import (
    CompanyCreate,
    CompanyFollowResponse,
    CompanyProfile,
    CompanyUpdate,
)
from app.schemas.job import JobItem
from app.services.matching_service import get_candidate_skills, normalize_skill
from app.utils.helpers import serialize_mongo_doc, utc_now_iso

router = APIRouter(prefix="/companies", tags=["Companies"])


async def _enrich_company_jobs_count(
    db: AsyncIOMotorDatabase,
    doc: Dict[str, Any],
    user_id: Optional[str] = None,
    cand_set: Optional[Set[str]] = None,
    user_ats_score: Optional[int] = None,
) -> Dict[str, Any]:
    comp_id = doc.get("id") or str(doc.get("_id", ""))
    comp_name = doc.get("name", "")
    comp_slug = doc.get("slug", "")

    # 1. Authoritative Following Status & Count for Authenticated User
    followers = doc.get("followers", [])
    if not isinstance(followers, list):
        followers = []
    doc["followers"] = followers
    doc["followersCount"] = len(followers)
    doc["isFollowing"] = bool(user_id and user_id in followers)

    # 2. Query open active engineering roles
    query: Dict[str, Any] = {
        "$or": [
            {"companyId": comp_id},
            {"companyId": comp_slug},
            {"company": {"$regex": f"^{re.escape(comp_name)}$", "$options": "i"}},
            {"companyName": {"$regex": f"^{re.escape(comp_name)}$", "$options": "i"}},
        ],
        "isActive": {"$ne": False},
        "status": {"$nin": ["closed", "draft"]},
    }
    jobs_cursor = db.jobs.find(query)
    jobs_list = await jobs_cursor.to_list(100)
    serialized_jobs = [serialize_mongo_doc(j) for j in jobs_list]

    # 3. Compute personalized match score for each job
    for j in serialized_jobs:
        job_skills = j.get("skills", [])
        if cand_set and job_skills:
            matched_count = 0
            for s in job_skills:
                s_name = s.get("name") if isinstance(s, dict) else str(s)
                m = normalize_skill(s_name) in cand_set
                if isinstance(s, dict):
                    s["isMatched"] = m
                if m:
                    matched_count += 1
            raw_match = int((matched_count / len(job_skills)) * 100)
            if user_ats_score:
                j["matchScore"] = max(20, min(99, int(raw_match * 0.65 + user_ats_score * 0.35)))
            else:
                j["matchScore"] = max(20, min(99, raw_match))
        elif user_ats_score:
            j["matchScore"] = user_ats_score

    doc["jobs"] = serialized_jobs
    doc["openJobsCount"] = len(serialized_jobs)

    # 4. Compute real-time personalized profile compatibility match for company
    tech_stack = doc.get("techStack", [])
    if cand_set and tech_stack:
        company_matched_count = sum(1 for t in tech_stack if normalize_skill(t) in cand_set)
        tech_match_pct = int((company_matched_count / len(tech_stack)) * 100)
        if user_ats_score:
            doc["matchScore"] = max(25, min(99, int(tech_match_pct * 0.6 + user_ats_score * 0.4)))
        else:
            doc["matchScore"] = max(25, min(99, tech_match_pct))
    elif user_ats_score:
        doc["matchScore"] = user_ats_score
    elif doc["jobs"]:
        job_scores = [j.get("matchScore", 82) for j in doc["jobs"] if j.get("matchScore")]
        doc["matchScore"] = int(sum(job_scores) / len(job_scores)) if job_scores else 82
    else:
        doc["matchScore"] = 85

    return doc


@router.get("", response_model=List[CompanyProfile])
async def get_companies(
    query: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch partner technology companies with real-time job counts, following status, and match scores."""
    repo = BaseRepository(db, "companies")
    filter_q: Dict[str, Any] = {}
    if query:
        safe_q = re.escape(query)
        filter_q["$or"] = [
            {"name": {"$regex": safe_q, "$options": "i"}},
            {"industry": {"$regex": safe_q, "$options": "i"}},
            {"techStack": {"$in": [query]}},
        ]

    # Fetch viewing user's candidate skills and ATS score for dynamic matching
    cand_set: Set[str] = set()
    user_ats_score: Optional[int] = None
    user_id = user["id"] if user else None

    if user_id:
        try:
            cand_set, _, _, _ = await get_candidate_skills(db, user_id)
            profile = await db.profiles.find_one({"userId": user_id})
            if profile and profile.get("atsScore"):
                user_ats_score = int(profile.get("atsScore"))
            else:
                active_res = await db.resumes.find_one({"userId": user_id, "isActive": True})
                if active_res and active_res.get("atsScore"):
                    user_ats_score = int(active_res.get("atsScore"))
        except Exception:
            pass

    docs = await repo.find_many(filter_q)
    for doc in docs:
        await _enrich_company_jobs_count(db, doc, user_id, cand_set, user_ats_score)
    return docs


@router.post("", response_model=CompanyProfile, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new company profile bound to the authenticated recruiter."""
    repo = BaseRepository(db, "companies")
    doc_data = payload.model_dump()
    if not doc_data.get("slug"):
        doc_data["slug"] = re.sub(r"[^a-z0-9]+", "-", doc_data["name"].lower()).strip("-")

    # Authoritative recruiter ownership
    doc_data["ownerId"] = user["id"]
    doc_data["recruiterIds"] = [user["id"]]
    doc_data["followers"] = []
    doc_data["followersCount"] = 0
    doc_data["createdAt"] = utc_now_iso()

    created = await repo.create(doc_data)
    await _enrich_company_jobs_count(db, created, user["id"])
    return created


@router.patch("/{company_id}", response_model=CompanyProfile)
async def update_company(
    company_id: str,
    payload: CompanyUpdate,
    user: Dict[str, Any] = Depends(require_role("recruiter", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update company profile details. Enforces recruiter ownership."""
    repo = BaseRepository(db, "companies")
    existing = await repo.collection.find_one({
        "$or": [{"slug": company_id}, {"id": company_id}]
    })
    if not existing:
        existing = await repo.get_by_id(company_id)

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{company_id}' not found.",
        )

    # Ownership check
    if user.get("role") != "admin":
        owner_id = existing.get("ownerId")
        recruiters = existing.get("recruiterIds", [])
        if owner_id != user["id"] and user["id"] not in recruiters:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You do not have permission to modify this company profile.",
            )

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_dict["updatedAt"] = utc_now_iso()
    target_id = existing.get("id") or str(existing["_id"])
    updated = await repo.update(target_id, update_dict)
    if not updated:
        existing.update(update_dict)
        updated = existing
    await _enrich_company_jobs_count(db, updated, user["id"])
    return updated


@router.get("/{slug_or_id}", response_model=CompanyProfile)
async def get_company_by_slug_or_id(
    slug_or_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch company dossier by slug or ID with live open jobs count."""
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
    serialized = serialize_mongo_doc(doc)
    user_id = user["id"] if user else None
    cand_set: Set[str] = set()
    user_ats_score: Optional[int] = None
    if user_id:
        try:
            cand_set, _, _, _ = await get_candidate_skills(db, user_id)
            profile = await db.profiles.find_one({"userId": user_id})
            if profile and profile.get("atsScore"):
                user_ats_score = int(profile.get("atsScore"))
        except Exception:
            pass

    await _enrich_company_jobs_count(db, serialized, user_id, cand_set, user_ats_score)
    return serialized


@router.get("/{company_id}/jobs", response_model=List[JobItem])
async def get_company_jobs(
    company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch open engineering jobs for a company."""
    comp_repo = BaseRepository(db, "companies")
    comp = await comp_repo.collection.find_one({"$or": [{"id": company_id}, {"slug": company_id}]})
    comp_name = comp.get("name", "") if comp else company_id

    query: Dict[str, Any] = {
        "$or": [
            {"companyId": company_id},
            {"company": {"$regex": f"^{re.escape(comp_name)}$", "$options": "i"}},
            {"companyName": {"$regex": f"^{re.escape(comp_name)}$", "$options": "i"}},
        ],
        "isActive": {"$ne": False},
        "status": {"$nin": ["closed", "draft"]},
    }
    docs = await db.jobs.find(query).to_list(100)
    return [serialize_mongo_doc(d) for d in docs]


@router.post("/{company_id}/follow", response_model=CompanyFollowResponse)
async def toggle_follow_company(
    company_id: str,
    user: Dict[str, Any] = Depends(get_write_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Toggle follow/unfollow status for a company in real-time."""
    repo = BaseRepository(db, "companies")
    comp = await repo.collection.find_one({"$or": [{"id": company_id}, {"slug": company_id}]})
    if not comp:
        comp = await repo.get_by_id(company_id)

    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with identifier '{company_id}' not found.",
        )

    followers = comp.get("followers", [])
    if not isinstance(followers, list):
        followers = []

    uid = user["id"]
    if uid in followers:
        followers = [f for f in followers if f != uid]
        is_following = False
    else:
        followers.append(uid)
        is_following = True

    await repo.collection.update_one(
        {"_id": comp["_id"]},
        {
            "$set": {
                "followers": followers,
                "followersCount": len(followers),
                "updatedAt": utc_now_iso(),
            }
        },
    )

    return CompanyFollowResponse(isFollowing=is_following, followersCount=len(followers))
