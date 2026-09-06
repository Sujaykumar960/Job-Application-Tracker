import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.recruiter import CandidateFilterQuery
from app.utils.helpers import serialize_mongo_doc, utc_now_iso
from app.utils.privacy import sanitize_candidate_privacy


SEED_CANDIDATES = [
    {
        "id": "cand-1",
        "name": "Alex Rivera",
        "role": "Distributed Systems & Backend Platform Engineer",
        "location": "Seattle, WA (Open to Remote & Hybrid)",
        "experienceLevel": "Mid Level",
        "yearsExperience": "2.5 yrs (Ex-CloudScale Intern)",
        "skills": ["Go", "Kafka", "PostgreSQL", "Redis Lua", "Docker", "Kubernetes"],
        "questionsSolved": 142,
        "totalQuestions": 150,
        "accuracy": 93.4,
        "streak": 14,
        "projectsCount": 4,
        "featuredProjects": ["Distributed Event Streaming Broker", "Sliding Window Rate Limiter Service"],
        "assessmentName": "Senior Backend & Concurrency Systems Exam",
        "assessmentScore": 94,
        "assessmentPercentile": "Top 6%",
        "jobMatch": 94,
        "targetRole": "Backend Software Engineer, Core Payments",
        "careerGrowthMetric": "+42% growth across 6 months • 14d streak",
        "atsScore": 88,
        "avatarInitials": "AR",
        "avatarGradient": "from-brand-600 to-indigo-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$165,000 - $195,000",
            "contactVisibility": "all_recruiters",
            "email": "alex.rivera@example.com",
            "phone": "+1 (206) 555-0194",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "CloudScale",
        },
    },
    {
        "id": "cand-2",
        "name": "Elena Rostova",
        "role": "Full Stack Engineer (React, TypeScript & Go)",
        "location": "Seattle, WA (Remote)",
        "experienceLevel": "Senior",
        "yearsExperience": "5 yrs",
        "skills": ["React", "TypeScript", "Next.js", "Go", "WebSockets", "GraphQL"],
        "questionsSolved": 158,
        "totalQuestions": 160,
        "accuracy": 94.8,
        "streak": 22,
        "projectsCount": 5,
        "featuredProjects": ["Turbopack Monorepo Analyzer", "CRDT Collaborative Editor"],
        "assessmentName": "Frontend Architecture & Systems Assessment",
        "assessmentScore": 95,
        "assessmentPercentile": "Top 4%",
        "jobMatch": 92,
        "targetRole": "Full Stack Product Engineer, Sync Engine",
        "careerGrowthMetric": "158 solved • Published open-source Rust bundler",
        "atsScore": 91,
        "avatarInitials": "ER",
        "avatarGradient": "from-rose-600 to-pink-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$180,000 - $215,000",
            "contactVisibility": "all_recruiters",
            "email": "elena.rostova@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-3",
        "name": "Devin Chen",
        "role": "Systems & Infrastructure Software Engineer",
        "location": "Seattle, WA",
        "experienceLevel": "Entry / Intern",
        "yearsExperience": "New Grad (UW Distributed Systems Lab)",
        "skills": ["C++", "Go", "Raft", "PostgreSQL", "Operating Systems", "Linux"],
        "questionsSolved": 110,
        "totalQuestions": 130,
        "accuracy": 89.2,
        "streak": 8,
        "projectsCount": 3,
        "featuredProjects": ["Raft Consensus Engine", "Multi-Master Postgres Benchmarker"],
        "assessmentName": "Systems Architecture & Algorithms",
        "assessmentScore": 88,
        "assessmentPercentile": "Top 12%",
        "jobMatch": 86,
        "targetRole": "Systems Software Engineer",
        "careerGrowthMetric": "UW CS Magna Cum Laude • 110 solved",
        "atsScore": 84,
        "avatarInitials": "DC",
        "avatarGradient": "from-cyan-600 to-blue-800",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": False,
            "salaryExpectation": "$130,000 - $155,000",
            "contactVisibility": "mutual_matches",
            "email": "devin.chen@uw.edu",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-4",
        "name": "Sophia Patel",
        "role": "Cloud Platform & Kubernetes SRE Specialist",
        "location": "Los Gatos, CA (Remote)",
        "experienceLevel": "Senior",
        "yearsExperience": "6 yrs",
        "skills": ["Kubernetes (CKA)", "AWS", "Terraform", "Go", "eBPF", "Service Mesh"],
        "questionsSolved": 125,
        "totalQuestions": 140,
        "accuracy": 91.0,
        "streak": 11,
        "projectsCount": 4,
        "featuredProjects": ["Multi-Cluster Ingress Mesh", "Automated DR Snapshot Restorer"],
        "assessmentName": "Cloud Native Infrastructure Benchmark",
        "assessmentScore": 96,
        "assessmentPercentile": "Top 2%",
        "jobMatch": 89,
        "targetRole": "Infrastructure & SRE Platform Engineer",
        "careerGrowthMetric": "Certified Kubernetes Administrator (CKA)",
        "atsScore": 89,
        "avatarInitials": "SP",
        "avatarGradient": "from-indigo-600 to-brand-800",
        "privacy": {
            "searchStatus": "casually_browsing",
            "showSalary": True,
            "salaryExpectation": "$195,000 - $235,000",
            "contactVisibility": "hidden",
            "email": "sophia.patel@example.com",
            "phone": "+1 (408) 555-0129",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "Netflix",
        },
    },
    {
        "id": "cand-5",
        "name": "Arjun Mehta",
        "role": "Database Kernel & Storage Systems Engineer",
        "location": "New York, NY (Hybrid)",
        "experienceLevel": "Lead",
        "yearsExperience": "8 yrs",
        "skills": ["Go", "Raft", "Distributed SQL", "PostgreSQL Internals", "C++"],
        "questionsSolved": 195,
        "totalQuestions": 200,
        "accuracy": 96.2,
        "streak": 30,
        "projectsCount": 6,
        "featuredProjects": ["LSM-Tree Key-Value Engine", "Paxos Consensus Sharding"],
        "assessmentName": "Distributed Database Systems Exam",
        "assessmentScore": 98,
        "assessmentPercentile": "Top 1%",
        "jobMatch": 95,
        "targetRole": "Principal Database Architect",
        "careerGrowthMetric": "195 solved • Storage engine maintainer",
        "atsScore": 93,
        "avatarInitials": "AM",
        "avatarGradient": "from-purple-600 to-indigo-900",
        "privacy": {
            "searchStatus": "casually_browsing",
            "showSalary": True,
            "salaryExpectation": "$220,000 - $260,000",
            "contactVisibility": "all_recruiters",
            "email": "arjun.mehta@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-6",
        "name": "Liam O'Connor",
        "role": "Backend Platform & High Availability Engineer",
        "location": "Bellevue, WA",
        "experienceLevel": "Mid Level",
        "yearsExperience": "4 yrs",
        "skills": ["Go", "Ruby", "MySQL", "High Availability", "Kafka", "Redis"],
        "questionsSolved": 134,
        "totalQuestions": 150,
        "accuracy": 90.5,
        "streak": 6,
        "projectsCount": 3,
        "featuredProjects": ["Zero-Downtime Migration Runner", "Distributed Shard Rebalancer"],
        "assessmentName": "Relational Scaling & Sharding Exam",
        "assessmentScore": 89,
        "assessmentPercentile": "Top 10%",
        "jobMatch": 85,
        "targetRole": "Backend Software Engineer, Core Payments",
        "careerGrowthMetric": "134 solved • +35% ATS Score growth",
        "atsScore": 86,
        "avatarInitials": "LO",
        "avatarGradient": "from-slate-700 to-surface-950",
        "privacy": {
            "searchStatus": "actively_looking",
            "showSalary": False,
            "salaryExpectation": "$160,000 - $185,000",
            "contactVisibility": "mutual_matches",
            "email": "liam.oc@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
    {
        "id": "cand-7",
        "name": "Rachel Green",
        "role": "Lead Observability Engineer",
        "location": "Boston, MA",
        "experienceLevel": "Lead",
        "yearsExperience": "9 yrs",
        "skills": ["Rust", "OpenTelemetry", "Go", "Prometheus"],
        "questionsSolved": 180,
        "totalQuestions": 180,
        "accuracy": 98.0,
        "streak": 45,
        "projectsCount": 7,
        "featuredProjects": ["Distributed Trace Exporter"],
        "assessmentName": "Observability Architecture",
        "assessmentScore": 99,
        "assessmentPercentile": "Top 1%",
        "jobMatch": 98,
        "targetRole": "Principal Observability Engineer",
        "careerGrowthMetric": "Open source contributor",
        "atsScore": 95,
        "avatarInitials": "RG",
        "avatarGradient": "from-emerald-600 to-teal-800",
        "privacy": {
            "searchStatus": "not_looking",
            "showSalary": True,
            "salaryExpectation": "$240,000 - $280,000",
            "contactVisibility": "hidden",
            "email": "rachel.green@example.com",
            "cloakedFromCurrentEmployer": False,
        },
    },
]


class CandidateRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "candidates")
        self.interactions_repo = BaseRepository(db, "recruiter_interactions")

    async def seed_if_empty(self) -> None:
        """Seed initial reference candidates if collection is empty."""
        count = await self.collection.count_documents({})
        if count == 0:
            import copy
            for cand in SEED_CANDIDATES:
                doc = copy.deepcopy(cand)
                doc.pop("_id", None)
                doc["createdAt"] = utc_now_iso()
                await self.collection.insert_one(doc)

    async def search_candidates(
        self,
        query: CandidateFilterQuery,
        recruiter_id: Optional[str] = None,
        recruiter_company: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        await self.seed_if_empty()
        filter_q: Dict[str, Any] = {}

        # Mandatory rule: not_looking candidates are never discoverable to recruiters
        filter_q["privacy.searchStatus"] = {"$ne": "not_looking"}

        if query.searchStatus and query.searchStatus.lower() != "not_looking":
            filter_q["privacy.searchStatus"] = query.searchStatus

        if query.role and query.role.lower() != "all":
            filter_q["role"] = {"$regex": re.escape(query.role), "$options": "i"}
        if query.skills and query.skills.lower() != "all":
            filter_q["skills"] = {"$regex": re.escape(query.skills), "$options": "i"}
        if query.experienceLevel and query.experienceLevel.lower() != "all":
            filter_q["experienceLevel"] = {"$regex": re.escape(query.experienceLevel), "$options": "i"}
        if query.location and query.location.lower() != "all":
            filter_q["location"] = {"$regex": re.escape(query.location), "$options": "i"}
        if query.minAssessmentScore:
            filter_q["assessmentScore"] = {"$gte": query.minAssessmentScore}
        if query.minJobMatch:
            filter_q["jobMatch"] = {"$gte": query.minJobMatch}
        if query.atsScore:
            filter_q["atsScore"] = {"$gte": query.atsScore}

        if query.search:
            safe_s = re.escape(query.search)
            filter_q["$or"] = [
                {"name": {"$regex": safe_s, "$options": "i"}},
                {"role": {"$regex": safe_s, "$options": "i"}},
                {"skills": {"$regex": safe_s, "$options": "i"}},
                {"location": {"$regex": safe_s, "$options": "i"}},
            ]

        skip = query.skip
        if query.page is not None and query.page > 0:
            skip = (query.page - 1) * query.limit

        docs = await self.find_many(
            filter_q,
            sort=[("jobMatch", -1), ("assessmentScore", -1)],
            limit=query.limit,
            skip=skip,
        )

        # Batch-fetch recruiter shortlist & interview interactions
        interactions_map: Dict[str, Dict[str, Any]] = {}
        if recruiter_id:
            interactions = await self.interactions_repo.find_many({"recruiterId": recruiter_id})
            interactions_map = {i["candidateId"]: i for i in interactions}

        results = []
        for doc in docs:
            cid = doc.get("id", str(doc.get("_id")))
            interaction = interactions_map.get(cid, {})
            doc["isShortlisted"] = interaction.get("isShortlisted", False)
            doc["interviewStage"] = interaction.get("interviewStage", "Not Started")

            # Apply strict privacy and employer cloaking controls
            sanitized = sanitize_candidate_privacy(
                doc,
                viewer_role="recruiter",
                viewer_id=recruiter_id,
                viewer_company=recruiter_company,
                is_list_view=True,
            )
            if sanitized is not None and not sanitized.get("isCloaked"):
                results.append(sanitized)

        return results

    async def get_candidate_details(
        self,
        candidate_id: str,
        recruiter_id: Optional[str] = None,
        recruiter_company: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        await self.seed_if_empty()
        doc = await self.get_by_id(candidate_id)
        if not doc:
            return None

        # Fetch per-recruiter interaction
        if recruiter_id:
            interaction = await self.interactions_repo.find_one({"recruiterId": recruiter_id, "candidateId": candidate_id})
            doc["isShortlisted"] = interaction.get("isShortlisted", False) if interaction else False
            doc["interviewStage"] = interaction.get("interviewStage", "Not Started") if interaction else "Not Started"
        else:
            doc["isShortlisted"] = False
            doc["interviewStage"] = "Not Started"

        sanitized = sanitize_candidate_privacy(
            doc,
            viewer_role="recruiter",
            viewer_id=recruiter_id,
            viewer_company=recruiter_company,
            is_list_view=False,
        )
        if sanitized is None or sanitized.get("isCloaked"):
            return None

        return sanitized

    async def shortlist_candidate(self, recruiter_id: str, candidate_id: str) -> bool:
        """Add candidate to recruiter's shortlist."""
        interaction = await self.interactions_repo.find_one({"recruiterId": recruiter_id, "candidateId": candidate_id})
        if interaction:
            await self.interactions_repo.update(interaction["id"], {"isShortlisted": True, "updatedAt": utc_now_iso()})
        else:
            await self.interactions_repo.create({
                "recruiterId": recruiter_id,
                "candidateId": candidate_id,
                "isShortlisted": True,
                "interviewStage": "Not Started",
            })
        return True

    async def unshortlist_candidate(self, recruiter_id: str, candidate_id: str) -> bool:
        """Remove candidate from recruiter's shortlist."""
        interaction = await self.interactions_repo.find_one({"recruiterId": recruiter_id, "candidateId": candidate_id})
        if interaction:
            await self.interactions_repo.update(interaction["id"], {"isShortlisted": False, "updatedAt": utc_now_iso()})
        return False

    async def toggle_shortlist(self, recruiter_id: str, candidate_id: str) -> bool:
        """Toggle shortlist state for candidate with this recruiter."""
        interaction = await self.interactions_repo.find_one({"recruiterId": recruiter_id, "candidateId": candidate_id})
        if interaction:
            new_val = not interaction.get("isShortlisted", False)
            await self.interactions_repo.update(interaction["id"], {"isShortlisted": new_val, "updatedAt": utc_now_iso()})
            return new_val
        else:
            await self.interactions_repo.create({
                "recruiterId": recruiter_id,
                "candidateId": candidate_id,
                "isShortlisted": True,
                "interviewStage": "Not Started",
                "updatedAt": utc_now_iso(),
            })
            return True

    async def update_interview_stage(
        self,
        recruiter_id: str,
        candidate_id: str,
        stage: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update interview stage for candidate with this recruiter."""
        interaction = await self.interactions_repo.find_one({"recruiterId": recruiter_id, "candidateId": candidate_id})
        if interaction:
            return await self.interactions_repo.update(interaction["id"], {
                "interviewStage": stage,
                "notes": notes,
                "updatedAt": utc_now_iso(),
            })
        else:
            return await self.interactions_repo.create({
                "recruiterId": recruiter_id,
                "candidateId": candidate_id,
                "isShortlisted": True,
                "interviewStage": stage,
                "notes": notes,
            })
