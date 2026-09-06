import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.job import JobFilterQuery
from app.utils.helpers import parse_salary_range, utc_now_iso


class JobRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "jobs")

    def _build_filter_criteria(self, query: JobFilterQuery) -> Dict[str, Any]:
        and_conditions: List[Dict[str, Any]] = [{"isActive": {"$ne": False}}]

        if query.search:
            safe_search = re.escape(query.search)
            and_conditions.append({
                "$or": [
                    {"title": {"$regex": safe_search, "$options": "i"}},
                    {"company": {"$regex": safe_search, "$options": "i"}},
                    {"companyName": {"$regex": safe_search, "$options": "i"}},
                    {"description": {"$regex": safe_search, "$options": "i"}},
                ]
            })

        if query.company and query.company.lower() != "all":
            safe_comp = re.escape(query.company)
            and_conditions.append({
                "$or": [
                    {"company": {"$regex": safe_comp, "$options": "i"}},
                    {"companyName": {"$regex": safe_comp, "$options": "i"}},
                ]
            })

        if query.location and query.location.lower() != "all":
            safe_loc = re.escape(query.location)
            and_conditions.append({"location": {"$regex": safe_loc, "$options": "i"}})

        exp_filter = query.experienceLevel or query.experience
        if exp_filter and exp_filter.lower() != "all":
            safe_exp = re.escape(exp_filter)
            and_conditions.append({"experienceLevel": {"$regex": f"^{safe_exp}$", "$options": "i"}})

        role_filter = query.roleCategory or query.role
        if role_filter and role_filter.lower() != "all":
            safe_role = re.escape(role_filter)
            and_conditions.append({"roleCategory": {"$regex": safe_role, "$options": "i"}})

        if query.workType and query.workType.lower() != "all":
            safe_work = re.escape(query.workType)
            and_conditions.append({"workType": {"$regex": f"^{safe_work}$", "$options": "i"}})

        if query.jobType and query.jobType.lower() != "all":
            safe_job = re.escape(query.jobType)
            and_conditions.append({"jobType": {"$regex": f"^{safe_job}$", "$options": "i"}})

        skill_filter = query.skills or query.skill
        if skill_filter and skill_filter.lower() != "all":
            safe_skill = re.escape(skill_filter)
            and_conditions.append({
                "$or": [
                    {"skills.name": {"$regex": safe_skill, "$options": "i"}},
                    {"requiredSkills": {"$regex": safe_skill, "$options": "i"}},
                ]
            })

        if query.minSalary is not None:
            and_conditions.append({
                "$or": [
                    {"salaryMax": {"$gte": query.minSalary}},
                    {"salaryMin": {"$gte": query.minSalary}},
                ]
            })

        if query.maxSalary is not None:
            and_conditions.append({
                "$or": [
                    {"salaryMin": {"$lte": query.maxSalary}},
                    {"salaryMax": {"$lte": query.maxSalary}},
                ]
            })

        if len(and_conditions) == 1:
            return and_conditions[0]
        return {"$and": and_conditions}

    async def count_jobs(self, query: JobFilterQuery) -> int:
        filter_q = self._build_filter_criteria(query)
        return await self.collection.count_documents(filter_q)

    async def search_jobs(
        self,
        query: JobFilterQuery,
        candidate_skills: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        filter_q = self._build_filter_criteria(query)

        sort_criteria = [("postedDate", -1)]
        if query.sortBy == "salary":
            sort_criteria = [("salaryMax", -1), ("postedDate", -1)]

        skip = query.skip
        if query.page is not None and query.page > 0:
            skip = (query.page - 1) * query.limit

        docs = await self.find_many(
            filter_q,
            sort=sort_criteria,
            limit=query.limit,
            skip=skip,
        )

        candidate_skills_set = {s.lower() for s in (candidate_skills or [])}
        results = []
        for doc in docs:
            skills = doc.get("skills", [])
            for s in skills:
                if isinstance(s, dict) and "name" in s:
                    s["isMatched"] = s["name"].lower() in candidate_skills_set
            doc["skills"] = skills

            # Calculate match score based on candidate skills
            if candidate_skills_set and skills:
                matched_count = sum(1 for s in skills if isinstance(s, dict) and s.get("isMatched"))
                doc["matchScore"] = min(99, max(60, int((matched_count / len(skills)) * 100)))

            results.append(doc)

        return results

    async def create(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        data = dict(doc_data)
        if "isActive" not in data:
            data["isActive"] = True
        if "company" in data and not data.get("companyName"):
            data["companyName"] = data["company"]
        if "salaryRange" in data and (data.get("salaryMin") is None or data.get("salaryMax") is None):
            s_min, s_max = parse_salary_range(data.get("salaryRange"))
            if data.get("salaryMin") is None:
                data["salaryMin"] = s_min
            if data.get("salaryMax") is None:
                data["salaryMax"] = s_max
        if "postedDate" not in data:
            data["postedDate"] = utc_now_iso().split("T")[0]
        if "postedAgo" not in data:
            data["postedAgo"] = "Just now"
        return await super().create(data)

    async def update(self, id_val: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = dict(update_data)
        if "salaryRange" in data and (data.get("salaryMin") is None or data.get("salaryMax") is None):
            s_min, s_max = parse_salary_range(data.get("salaryRange"))
            if data.get("salaryMin") is None:
                data["salaryMin"] = s_min
            if data.get("salaryMax") is None:
                data["salaryMax"] = s_max
        return await super().update(id_val, data)
