import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_database
from app.dependencies import require_role
from app.utils.helpers import utc_now_iso

logger = logging.getLogger("careerx.admin")

router = APIRouter(prefix="/admin", tags=["Admin Governance"])


class UserStatusUpdate(BaseModel):
    isActive: Optional[bool] = None
    role: Optional[str] = None


@router.get("/overview")
async def get_admin_overview(
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Aggregate platform-wide health, operational metrics, and governance counts."""
    # 1. User counts
    total_users = await db.users.count_documents({})
    total_seekers = await db.users.count_documents({"role": "seeker"})
    total_recruiters = await db.users.count_documents({"role": "recruiter"})
    total_admins = await db.users.count_documents({"role": "admin"})

    # 2. Jobs and Applications
    total_jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"isActive": True})
    total_applications = await db.applications.count_documents({})

    # 3. Resumes and Community
    total_resumes = await db.resumes.count_documents({})
    total_posts = await db.posts.count_documents({})

    return {
        "metrics": {
            "totalUsers": total_users,
            "totalSeekers": total_seekers,
            "totalRecruiters": total_recruiters,
            "totalAdmins": total_admins,
            "totalJobs": total_jobs,
            "activeJobs": active_jobs,
            "totalApplications": total_applications,
            "totalResumes": total_resumes,
            "totalPosts": total_posts,
        },
        "system": {
            "status": "operational",
            "environment": "production",
            "timestamp": utc_now_iso(),
        }
    }


@router.get("/users")
async def list_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Paginated user directory with role filters and search capabilities."""
    filter_query: Dict[str, Any] = {}
    if role:
        filter_query["role"] = role
    if q:
        filter_query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]

    total = await db.users.count_documents(filter_query)
    cursor = db.users.find(filter_query, {"passwordHash": 0}).skip(skip).limit(limit)
    users_raw = await cursor.to_list(length=limit)

    users_list = []
    for u in users_raw:
        u["id"] = str(u.get("_id")) if "_id" in u else u.get("id")
        u.pop("_id", None)
        # Fetch associated profile name if missing
        if "name" not in u:
            prof = await db.profiles.find_one({"userId": u["id"]})
            u["name"] = prof.get("name", "Unknown User") if prof else "Unknown User"
        users_list.append(u)

    return {
        "users": users_list,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    body: UserStatusUpdate,
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Admin modification of user lifecycle (active/inactive) or role elevation."""
    current_admin_id = str(user.get("id") or user.get("_id"))
    if user_id == current_admin_id and body.isActive is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    # Find user
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"id": user_id}
    target_user = await db.users.find_one(query)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_fields: Dict[str, Any] = {"updatedAt": utc_now_iso()}
    if body.isActive is not None:
        update_fields["isActive"] = body.isActive
    if body.role is not None:
        if body.role not in ["seeker", "recruiter", "admin"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified")
        update_fields["role"] = body.role

    await db.users.update_one(query, {"$set": update_fields})

    # Log audit trail
    await db.audit_logs.insert_one({
        "event": "admin_user_update",
        "actorId": current_admin_id,
        "targetUserId": user_id,
        "changes": body.model_dump(exclude_unset=True),
        "timestamp": utc_now_iso(),
    })

    return {"message": "User status updated successfully", "userId": user_id, "changes": update_fields}


@router.get("/moderation/posts")
async def list_posts_for_moderation(
    limit: int = Query(50, ge=1, le=100),
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Moderation queue of recent community feed posts."""
    cursor = db.posts.find({}).sort("createdAt", -1).limit(limit)
    posts = await cursor.to_list(length=limit)
    for p in posts:
        p["id"] = p.get("id") or str(p.get("_id"))
        p.pop("_id", None)
    return {"posts": posts, "total": len(posts)}


@router.delete("/moderation/posts/{post_id}")
async def moderate_delete_post(
    post_id: str,
    reason: Optional[str] = "Terms of Service Violation",
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Admin takedown of community content."""
    query = {"$or": [{"id": post_id}, {"_id": ObjectId(post_id)}]} if ObjectId.is_valid(post_id) else {"id": post_id}
    res = await db.posts.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Log audit trail
    current_admin_id = str(user.get("id") or user.get("_id"))
    await db.audit_logs.insert_one({
        "event": "admin_post_takedown",
        "actorId": current_admin_id,
        "targetPostId": post_id,
        "reason": reason,
        "timestamp": utc_now_iso(),
    })

    return {"message": "Post successfully moderated and removed", "postId": post_id}


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    user: Dict[str, Any] = Depends(require_role("admin")),
    db=Depends(get_database),
):
    """Retrieve platform administrative audit trail."""
    cursor = db.audit_logs.find({}).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    for l in logs:
        l["id"] = str(l.get("_id")) if "_id" in l else l.get("id")
        l.pop("_id", None)
    return {"auditLogs": logs}
