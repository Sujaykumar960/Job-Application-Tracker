"""Immutable recruiter tenant scoping.

A recruiter's tenant (company) must never be derivable from something the
recruiter can edit themselves. Historically `_resolve_recruiter_company`
fell back to the self-editable `profiles.company`, which let a recruiter
PATCH /users/me with `{"company": "Google"}` and gain full access to a
foreign company's jobs, applicants, candidates and metrics.

Authoritative sources only:
  * `users.company` - server-side field stamped at seed/registration time;
    no self-service endpoint writes it.
  * `companies.recruiterIds` - explicit membership managed by the company
    create/update flows.

`profiles.company` is treated as display data only and is never consulted
for authorization scope.
"""

import re
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase


async def resolve_recruiter_company(
    db: AsyncIOMotorDatabase,
    user: Dict[str, Any],
) -> Optional[str]:
    """Resolve a recruiter's tenant from immutable sources, failing closed.

    Returns the company *name* (so callers can compare against job
    `company`/`companyName` fields) or None when the recruiter has no
    membership. Callers must then restrict results to jobs they own.
    """
    company = user.get("company")
    if company and str(company).strip():
        return str(company).strip()

    recruiter_id = user.get("id") or str(user.get("_id"))
    if recruiter_id:
        comp = await db.companies.find_one({"recruiterIds": recruiter_id})
        if comp and comp.get("name"):
            return comp["name"]

    return None


async def backfill_recruiter_company_membership(db: AsyncIOMotorDatabase) -> int:
    """Promote legacy self-served company into immutable membership.

    Was deployed with `profiles.company` as the scoping source, so existing
    recruiters may only carry a company there. Copy it into `users.company`
    and, where a matching company doc exists, into `companies.recruiterIds`.

    Idempotent and additive: recruiters that already have an immutable
    company (either source) are skipped, so this is safe to run on every
    boot. Returns the number of recruiters backfilled.
    """
    count = 0
    cursor = db.users.find({"role": "recruiter"})
    for user in await cursor.to_list(1000):
        if user.get("company"):
            continue
        recruiter_id = user.get("id") or str(user.get("_id"))
        if not recruiter_id:
            continue
        prof = await db.profiles.find_one({"userId": recruiter_id})
        legacy = prof.get("company") if prof else None
        if not legacy or not str(legacy).strip():
            continue
        await db.users.update_one(
            {"id": recruiter_id},
            {"$set": {"company": str(legacy).strip()}},
        )
        await db.companies.update_one(
            {"name": {"$regex": f"^{re.escape(str(legacy).strip())}$", "$options": "i"}},
            {"$addToSet": {"recruiterIds": recruiter_id}},
        )
        count += 1
    return count