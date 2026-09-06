"""
CareerX Database Verification Script for Resume AI and Analyses.

Audits MongoDB collections for referential integrity and user ownership compliance:
  - Resumes without userId
  - Analyses without userId
  - Analyses without resumeId
  - Mismatched userId relationships (analysis.userId != resume.userId)
  - Duplicate global resume records
  - Quarantined records inventory
"""

import argparse
import asyncio
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import DatabaseManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ResumeVerification")

MOCK_USER_IDS = {"global", "mock", "demo", "placeholder", "test-mock", "null", "undefined", ""}
MOCK_ID_PREFIXES = ("mock-", "demo-", "global-", "placeholder-")


def _is_invalid_user_id(val: Optional[str]) -> bool:
    if not val:
        return True
    s = str(val).strip().lower()
    if s in MOCK_USER_IDS:
        return True
    return s.startswith(MOCK_ID_PREFIXES)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_resume_verification(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Run comprehensive integrity audit across resumes, resume_analyses, and quarantine collections.
    """
    logger.info("Executing database verification audit for Resume AI...")

    report: Dict[str, Any] = {
        "timestamp": _now_iso(),
        "is_clean": True,
        "summary": {
            "total_resumes": 0,
            "total_analyses": 0,
            "resumes_without_userId": 0,
            "analyses_without_userId": 0,
            "analyses_without_resumeId": 0,
            "mismatched_userId_relationships": 0,
            "duplicate_global_records": 0,
            "quarantined_resumes_count": 0,
            "quarantined_analyses_count": 0,
        },
        "violations": {
            "resumes_without_userId": [],
            "analyses_without_userId": [],
            "analyses_without_resumeId": [],
            "mismatched_userId_relationships": [],
            "duplicate_global_records": [],
        },
    }

    # 1. Inspect Resumes
    all_resumes = await db.resumes.find({}).to_list(length=10000)
    report["summary"]["total_resumes"] = len(all_resumes)

    resumes_by_id: Dict[str, Dict[str, Any]] = {}
    seen_storage_keys: Dict[str, str] = {}

    for r in all_resumes:
        r_id = r.get("id") or str(r.get("_id"))
        resumes_by_id[r_id] = r
        user_id = r.get("userId")
        storage_key = r.get("storageKey")

        if _is_invalid_user_id(user_id):
            report["summary"]["resumes_without_userId"] += 1
            report["violations"]["resumes_without_userId"].append({
                "id": r_id,
                "userId": user_id,
                "filename": r.get("filename") or r.get("originalFilename"),
            })
            report["is_clean"] = False

        if storage_key:
            if storage_key in seen_storage_keys and seen_storage_keys[storage_key] != str(user_id):
                report["summary"]["duplicate_global_records"] += 1
                report["violations"]["duplicate_global_records"].append({
                    "id": r_id,
                    "collidingId": seen_storage_keys[storage_key],
                    "storageKey": storage_key,
                })
                report["is_clean"] = False
            else:
                seen_storage_keys[storage_key] = str(user_id)

    # 2. Inspect Resume Analyses
    all_analyses = await db.resume_analyses.find({}).to_list(length=10000)
    report["summary"]["total_analyses"] = len(all_analyses)

    for a in all_analyses:
        a_id = a.get("id") or str(a.get("_id"))
        a_user_id = a.get("userId")
        a_resume_id = a.get("resumeId")

        # Missing or invalid userId
        if _is_invalid_user_id(a_user_id):
            report["summary"]["analyses_without_userId"] += 1
            report["violations"]["analyses_without_userId"].append({
                "id": a_id,
                "userId": a_user_id,
                "resumeId": a_resume_id,
            })
            report["is_clean"] = False

        # Missing or invalid resumeId
        if not a_resume_id or _is_invalid_user_id(a_resume_id):
            report["summary"]["analyses_without_resumeId"] += 1
            report["violations"]["analyses_without_resumeId"].append({
                "id": a_id,
                "userId": a_user_id,
                "resumeId": a_resume_id,
            })
            report["is_clean"] = False
        else:
            # Check referential integrity with resumes collection
            linked_resume = resumes_by_id.get(a_resume_id)
            if not linked_resume:
                # Referenced resume not found in active collection
                report["summary"]["analyses_without_resumeId"] += 1
                report["violations"]["analyses_without_resumeId"].append({
                    "id": a_id,
                    "reason": f"Referenced resumeId '{a_resume_id}' does not exist in resumes collection",
                    "userId": a_user_id,
                    "resumeId": a_resume_id,
                })
                report["is_clean"] = False
            else:
                # Verify resume.userId == analysis.userId
                resume_user_id = linked_resume.get("userId")
                if str(a_user_id) != str(resume_user_id):
                    report["summary"]["mismatched_userId_relationships"] += 1
                    report["violations"]["mismatched_userId_relationships"].append({
                        "analysisId": a_id,
                        "analysisUserId": a_user_id,
                        "resumeId": a_resume_id,
                        "resumeUserId": resume_user_id,
                    })
                    report["is_clean"] = False

    # 3. Inventory Quarantine Collections
    if "quarantine_resumes" in await db.list_collection_names():
        report["summary"]["quarantined_resumes_count"] = await db.quarantine_resumes.count_documents({})
    if "quarantine_resume_analyses" in await db.list_collection_names():
        report["summary"]["quarantined_analyses_count"] = await db.quarantine_resume_analyses.count_documents({})

    logger.info(f"Verification completed. is_clean={report['is_clean']}, summary={report['summary']}")
    return report


def main():
    parser = argparse.ArgumentParser(description="CareerX Resume AI MongoDB Verification Audit Tool")
    args = parser.parse_args()

    async def _runner():
        await DatabaseManager.connect()
        db = DatabaseManager.db
        if db is None:
            logger.error("Database connection failed.")
            return
        report = await run_resume_verification(db)
        import pprint
        pprint.pprint(report)

    asyncio.run(_runner())


if __name__ == "__main__":
    main()
