import asyncio
import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.candidate_repository import CandidateRepository
from app.schemas.recruiter import CandidateFilterQuery
from app.schemas.search import (
    CandidateSearchResultItem,
    JobSearchResultItem,
    PersonSearchResultItem,
    PostSearchResultItem,
    SearchCounts,
    SearchResultsContainer,
    UnifiedSearchResponse,
)


class SearchService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def search_all(
        self,
        q: str,
        search_type: str = "all",
        user: Optional[Dict[str, Any]] = None,
        limit: int = 10,
    ) -> UnifiedSearchResponse:
        clean_q = q.strip()
        if not clean_q:
            return UnifiedSearchResponse(
                query="",
                type=search_type,
                counts=SearchCounts(jobs=0, people=0, posts=0, candidates=0, total=0),
                results=SearchResultsContainer(jobs=[], people=[], posts=[], candidates=[]),
            )

        jobs: List[JobSearchResultItem] = []
        people: List[PersonSearchResultItem] = []
        posts: List[PostSearchResultItem] = []
        candidates: List[CandidateSearchResultItem] = []

        # Execute selected or all searches concurrently
        tasks = []
        task_names = []

        if search_type in ["all", "jobs"]:
            tasks.append(self._search_jobs(clean_q, limit))
            task_names.append("jobs")

        if search_type in ["all", "people"]:
            tasks.append(self._search_people(clean_q, limit))
            task_names.append("people")

        if search_type in ["all", "posts"]:
            tasks.append(self._search_posts(clean_q, limit))
            task_names.append("posts")

        if search_type in ["all", "candidates"]:
            # Only recruiters / admins can search candidates
            tasks.append(self._search_candidates(clean_q, user, limit))
            task_names.append("candidates")

        results = await asyncio.gather(*tasks)
        for name, res in zip(task_names, results):
            if name == "jobs":
                jobs = res
            elif name == "people":
                people = res
            elif name == "posts":
                posts = res
            elif name == "candidates":
                candidates = res

        total_matches = len(jobs) + len(people) + len(posts) + len(candidates)
        counts = SearchCounts(
            jobs=len(jobs),
            people=len(people),
            posts=len(posts),
            candidates=len(candidates),
            total=total_matches,
        )

        return UnifiedSearchResponse(
            query=clean_q,
            type=search_type,
            counts=counts,
            results=SearchResultsContainer(
                jobs=jobs,
                people=people,
                posts=posts,
                candidates=candidates,
            ),
        )

    async def _search_jobs(self, q: str, limit: int) -> List[JobSearchResultItem]:
        safe_q = re.escape(q)
        filter_q = {
            "$or": [
                {"title": {"$regex": safe_q, "$options": "i"}},
                {"company": {"$regex": safe_q, "$options": "i"}},
                {"skills": {"$regex": safe_q, "$options": "i"}},
                {"description": {"$regex": safe_q, "$options": "i"}},
                {"location": {"$regex": safe_q, "$options": "i"}},
            ]
        }
        docs = await self.db.jobs.find(filter_q).limit(limit).to_list(limit)
        items = []
        for d in docs:
            jid = str(d.get("id") or d.get("_id"))
            items.append(
                JobSearchResultItem(
                    id=jid,
                    title=d.get("title", ""),
                    company=d.get("company", ""),
                    location=d.get("location", "Remote"),
                    workType=d.get("workType", "Remote"),
                    jobType=d.get("jobType", "Full-time"),
                    salary=d.get("salary") or d.get("salaryRange"),
                    skills=d.get("skills", []),
                    matchScore=d.get("matchScore", 85),
                )
            )
        return items

    async def _search_people(self, q: str, limit: int) -> List[PersonSearchResultItem]:
        safe_q = re.escape(q)
        filter_q = {
            "$or": [
                {"name": {"$regex": safe_q, "$options": "i"}},
                {"headline": {"$regex": safe_q, "$options": "i"}},
                {"company": {"$regex": safe_q, "$options": "i"}},
                {"skills": {"$regex": safe_q, "$options": "i"}},
                {"location": {"$regex": safe_q, "$options": "i"}},
            ]
        }
        docs = await self.db.profiles.find(filter_q).limit(limit).to_list(limit)
        items = []
        for d in docs:
            pid = str(d.get("userId") or d.get("id") or d.get("_id"))
            items.append(
                PersonSearchResultItem(
                    id=pid,
                    name=d.get("name", ""),
                    headline=d.get("headline", ""),
                    company=d.get("company", ""),
                    location=d.get("location", ""),
                    skills=d.get("skills", []),
                    avatarInitials=d.get("avatarInitials", "CX"),
                    avatarGradient=d.get("avatarGradient", "from-brand-600 to-indigo-800"),
                )
            )
        return items

    async def _search_posts(self, q: str, limit: int) -> List[PostSearchResultItem]:
        safe_q = re.escape(q)
        filter_q = {
            "$or": [
                {"content": {"$regex": safe_q, "$options": "i"}},
                {"tags": {"$regex": safe_q, "$options": "i"}},
                {"author.name": {"$regex": safe_q, "$options": "i"}},
            ]
        }
        docs = await self.db.posts.find(filter_q).sort("createdAt", -1).limit(limit).to_list(limit)
        items = []
        for d in docs:
            pid = str(d.get("id") or d.get("_id"))
            author = d.get("author", {})
            author_name = author.get("name") if isinstance(author, dict) else str(author)
            items.append(
                PostSearchResultItem(
                    id=pid,
                    type=d.get("type", "Technical Discussion"),
                    content=d.get("content", ""),
                    tags=d.get("tags", []),
                    authorName=author_name or "Anonymous",
                    createdAt=d.get("createdAt", ""),
                    likesCount=d.get("likesCount", 0),
                    commentsCount=d.get("commentsCount", 0),
                )
            )
        return items

    async def _search_candidates(
        self,
        q: str,
        user: Optional[Dict[str, Any]],
        limit: int,
    ) -> List[CandidateSearchResultItem]:
        if not user or user.get("role") not in ["recruiter", "admin"]:
            return []

        recruiter_id = user["id"]
        recruiter_company = user.get("company")
        if not recruiter_company:
            prof = await self.db.profiles.find_one({"userId": recruiter_id})
            if prof and prof.get("company"):
                recruiter_company = prof["company"]

        repo = CandidateRepository(self.db)
        query = CandidateFilterQuery(search=q, limit=limit)
        docs = await repo.search_candidates(query, recruiter_id=recruiter_id, recruiter_company=recruiter_company)

        items = []
        for d in docs:
            items.append(
                CandidateSearchResultItem(
                    id=d.get("id", ""),
                    name=d.get("name", ""),
                    role=d.get("role", ""),
                    location=d.get("location", ""),
                    experienceLevel=d.get("experienceLevel", "Mid Level"),
                    skills=d.get("skills", []),
                    atsScore=d.get("atsScore", 85),
                    jobMatch=d.get("jobMatch", 85),
                    isShortlisted=d.get("isShortlisted", False),
                )
            )
        return items
