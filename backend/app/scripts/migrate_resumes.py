"""
Safe Migration and Cleanup Strategy for Resume AI MongoDB Data.

Classifies all resume and analysis records:
  1. Correctly owned records (untouched)
  2. Clearly attributable records (migrated with deterministic attribution)
  3. Orphaned records (moved to quarantine collection)
  4. Global / mock records (moved to quarantine collection)
  5. Duplicate records (deduplicated / quarantined)

Guarantees:
  - Idempotent: safe to run repeatedly.
  - Zero Guessing: never assigns ambiguous data to a random user.
  - Non-destructive by default: unlinked data is safely preserved in quarantine collections.
"""

import argparse
import asyncio
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.database import DatabaseManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ResumeMigration")

MOCK_EXPLICIT_VALUES = {"global", "mock", "demo", "placeholder", "test-mock"}
MOCK_ID_PREFIXES = ("mock-", "demo-", "global-", "placeholder-")


def _is_mock_value(val: Optional[str]) -> bool:
    if not val:
        return False
    s = str(val).strip().lower()
    if s in MOCK_EXPLICIT_VALUES:
        return True
    return s.startswith(MOCK_ID_PREFIXES)


def _is_empty_or_null(val: Optional[str]) -> bool:
    if val is None:
        return True
    s = str(val).strip().lower()
    return s in {"", "null", "undefined", "none"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def run_resume_migration(
    db: AsyncIOMotorDatabase,
    dry_run: bool = False,
    purge_quarantine: bool = False,
) -> Dict[str, Any]:
    """
    Execute comprehensive Resume AI data classification, migration, and quarantine.
    """
    logger.info(f"Starting Resume AI migration (dry_run={dry_run}, purge_quarantine={purge_quarantine})...")

    report: Dict[str, Any] = {
        "timestamp": _now_iso(),
        "dry_run": dry_run,
        "purge_quarantine": purge_quarantine,
        "resumes": {
            "scanned": 0,
            "correctly_owned": 0,
            "attributed_migrated": 0,
            "quarantined_orphaned": 0,
            "quarantined_mock": 0,
            "quarantined_duplicate": 0,
        },
        "analyses": {
            "scanned": 0,
            "correctly_owned": 0,
            "attributed_migrated": 0,
            "quarantined_orphaned": 0,
            "quarantined_mock": 0,
            "quarantined_mismatched": 0,
        },
        "details": [],
    }

    # =========================================================================
    # 1. PROCESS RESUMES COLLECTION
    # =========================================================================
    all_resumes = await db.resumes.find({}).to_list(length=10000)
    seen_storage_keys: Dict[str, str] = {}

    for r in all_resumes:
        report["resumes"]["scanned"] += 1
        r_id = r.get("id") or str(r.get("_id"))
        user_id = r.get("userId")
        owner_id = r.get("ownerId")
        storage_key = r.get("storageKey")

        # Check 1: Mock / Global records
        if _is_mock_value(r_id) or _is_mock_value(user_id):
            report["resumes"]["quarantined_mock"] += 1
            report["details"].append(f"Quarantining mock/global resume: {r_id}")
            if not dry_run:
                await _quarantine_resume(db, r, "Global or mock resume document missing authentic user ownership", purge_quarantine)
            continue

        # Check 2: Deduplication (Duplicate storage keys without distinct users)
        if storage_key:
            if storage_key in seen_storage_keys and seen_storage_keys[storage_key] != str(user_id):
                report["resumes"]["quarantined_duplicate"] += 1
                report["details"].append(f"Quarantining duplicate storageKey resume: {r_id} (key: {storage_key})")
                if not dry_run:
                    await _quarantine_resume(db, r, f"Duplicate storageKey collision with resume {seen_storage_keys[storage_key]}", purge_quarantine)
                continue
            seen_storage_keys[storage_key] = str(user_id)

        # Check 3: Clearly attributable records (e.g. ownerId present or fileId mapped)
        if _is_empty_or_null(user_id) and owner_id and not _is_mock_value(owner_id) and not _is_empty_or_null(owner_id):
            report["resumes"]["attributed_migrated"] += 1
            report["details"].append(f"Migrating resume {r_id}: setting userId from ownerId ({owner_id})")
            if not dry_run:
                await db.resumes.update_one({"_id": r["_id"]}, {"$set": {"userId": owner_id, "updatedAt": _now_iso()}})
            continue

        file_id = r.get("fileId")
        if _is_empty_or_null(user_id) and file_id:
            file_meta = await db.files.find_one({"id": file_id})
            if file_meta and file_meta.get("ownerId") and not _is_mock_value(file_meta["ownerId"]) and not _is_empty_or_null(file_meta["ownerId"]):
                report["resumes"]["attributed_migrated"] += 1
                report["details"].append(f"Migrating resume {r_id}: setting userId from files collection ({file_meta['ownerId']})")
                if not dry_run:
                    await db.resumes.update_one({"_id": r["_id"]}, {"$set": {"userId": file_meta["ownerId"], "updatedAt": _now_iso()}})
                continue

        # Check 4: Orphaned records with unresolvable userId
        if _is_empty_or_null(user_id):
            report["resumes"]["quarantined_orphaned"] += 1
            report["details"].append(f"Quarantining orphaned resume without userId: {r_id}")
            if not dry_run:
                await _quarantine_resume(db, r, "Orphaned resume document without identifiable user ownership", purge_quarantine)
            continue

        # Check 5: Correctly owned records
        report["resumes"]["correctly_owned"] += 1

    # =========================================================================
    # 2. PROCESS RESUME_ANALYSES COLLECTION
    # =========================================================================
    all_analyses = await db.resume_analyses.find({}).to_list(length=10000)

    for a in all_analyses:
        report["analyses"]["scanned"] += 1
        a_id = a.get("id") or str(a.get("_id"))
        a_user_id = a.get("userId")
        a_resume_id = a.get("resumeId")

        # Check 1: Mock / Global analyses
        if _is_mock_value(a_id) or _is_mock_value(a_user_id) or _is_mock_value(a_resume_id):
            report["analyses"]["quarantined_mock"] += 1
            report["details"].append(f"Quarantining mock/global analysis: {a_id}")
            if not dry_run:
                await _quarantine_analysis(db, a, "Global or mock analysis missing authentic user and resume ownership", purge_quarantine)
            continue

        # Check 2: Resolve and validate against resume document
        linked_resume = None
        if a_resume_id and not _is_empty_or_null(a_resume_id):
            linked_resume = await db.resumes.find_one({"id": a_resume_id})

        # Check 3: Clearly attributable analysis from referenced resume
        if linked_resume:
            resume_user_id = linked_resume.get("userId")
            if _is_empty_or_null(a_user_id) and resume_user_id:
                # Deterministic attribution: analysis userId derived from verified resume ownership
                report["analyses"]["attributed_migrated"] += 1
                report["details"].append(f"Migrating analysis {a_id}: setting userId from linked resume ({resume_user_id})")
                if not dry_run:
                    await db.resume_analyses.update_one({"_id": a["_id"]}, {"$set": {"userId": resume_user_id, "updatedAt": _now_iso()}})
                continue

            if not _is_empty_or_null(a_user_id) and resume_user_id:
                if str(a_user_id) != str(resume_user_id):
                    # Mismatched ownership: analysis user != resume user
                    report["analyses"]["quarantined_mismatched"] += 1
                    report["details"].append(f"Quarantining mismatched analysis {a_id}: analysis.userId={a_user_id} != resume.userId={resume_user_id}")
                    if not dry_run:
                        await _quarantine_analysis(db, a, f"Mismatched ownership: analysis.userId ({a_user_id}) != resume.userId ({resume_user_id})", purge_quarantine)
                    continue
                else:
                    # Correctly owned analysis matching resume owner
                    report["analyses"]["correctly_owned"] += 1
                    continue

        # Check 4: Analysis has userId, but resumeId is missing or unlinked
        if not _is_empty_or_null(a_user_id):
            user_resume = await db.resumes.find_one({"userId": a_user_id, "latestAnalysisId": a_id})
            if not user_resume:
                user_resume = await db.resumes.find_one({"userId": a_user_id, "isPrimary": True})

            if user_resume:
                report["analyses"]["attributed_migrated"] += 1
                report["details"].append(f"Migrating analysis {a_id}: linking resumeId ({user_resume['id']}) for user {a_user_id}")
                if not dry_run:
                    await db.resume_analyses.update_one({"_id": a["_id"]}, {"$set": {"resumeId": user_resume["id"], "updatedAt": _now_iso()}})
                continue

        # Check 5: Orphaned analysis without valid resume or user
        report["analyses"]["quarantined_orphaned"] += 1
        report["details"].append(f"Quarantining orphaned analysis: {a_id}")
        if not dry_run:
            await _quarantine_analysis(db, a, "Orphaned analysis missing valid resumeId or authentic userId relationship", purge_quarantine)

    logger.info(f"Migration completed. Resumes: {report['resumes']}, Analyses: {report['analyses']}")
    return report


async def _quarantine_resume(db: AsyncIOMotorDatabase, resume_doc: Dict[str, Any], reason: str, purge: bool = False):
    """Safely move resume to quarantine collection or delete if purge requested."""
    doc = dict(resume_doc)
    doc_id = doc.get("_id")
    if not purge:
        doc["quarantinedAt"] = _now_iso()
        doc["quarantineReason"] = reason
        doc["originalCollection"] = "resumes"
        # Upsert into quarantine_resumes
        await db.quarantine_resumes.update_one({"_id": doc_id}, {"$set": doc}, upsert=True)
    await db.resumes.delete_one({"_id": doc_id})


async def _quarantine_analysis(db: AsyncIOMotorDatabase, analysis_doc: Dict[str, Any], reason: str, purge: bool = False):
    """Safely move analysis to quarantine collection or delete if purge requested."""
    doc = dict(analysis_doc)
    doc_id = doc.get("_id")
    if not purge:
        doc["quarantinedAt"] = _now_iso()
        doc["quarantineReason"] = reason
        doc["originalCollection"] = "resume_analyses"
        # Upsert into quarantine_resume_analyses
        await db.quarantine_resume_analyses.update_one({"_id": doc_id}, {"$set": doc}, upsert=True)
    await db.resume_analyses.delete_one({"_id": doc_id})


def main():
    parser = argparse.ArgumentParser(description="CareerX Resume AI MongoDB Data Migration Tool")
    parser.add_argument("--dry-run", action="store_true", help="Scan and report classification without mutating data")
    parser.add_argument("--purge", action="store_true", help="Permanently purge quarantined unowned records")
    args = parser.parse_args()

    async def _runner():
        await DatabaseManager.connect()
        db = DatabaseManager.db
        if db is None:
            logger.error("Database connection failed.")
            return
        report = await run_resume_migration(db, dry_run=args.dry_run, purge_quarantine=args.purge)
        import pprint
        pprint.pprint(report)

    asyncio.run(_runner())


if __name__ == "__main__":
    main()
