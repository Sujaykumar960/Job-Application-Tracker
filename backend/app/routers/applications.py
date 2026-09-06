from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db
from app.repositories.application_repository import ApplicationRepository
from app.schemas.application import (
    ApplicationCreate,
    ApplicationFilterQuery,
    ApplicationResponse,
    ApplicationStatsResponse,
    ApplicationUpdate,
)
from app.schemas.common import StandardSuccessResponse
from app.utils.helpers import utc_now_iso

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/stats", response_model=ApplicationStatsResponse)
async def get_application_stats(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch live dashboard aggregation statistics for the authenticated seeker."""
    user_id = user["id"]
    repo = ApplicationRepository(db)
    stats_dict = await repo.get_stats_for_user(user_id)
    return ApplicationStatsResponse(**stats_dict)


@router.get("", response_model=List[ApplicationResponse])
async def get_applications(
    status: Optional[str] = Query(None, description="Filter by status: Applied, Interview, Offer, Rejected"),
    priority: Optional[str] = Query(None, description="Filter by priority: High, Medium, Low"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    upcoming: Optional[bool] = Query(None, description="Filter for upcoming interviews or deadlines"),
    search: Optional[str] = Query(None, description="Search company, role, or notes"),
    limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch tracked job applications for the authenticated seeker."""
    repo = ApplicationRepository(db)
    user_id = user["id"]
    filter_query = ApplicationFilterQuery(
        status=status,
        priority=priority,
        company=company,
        upcoming=upcoming,
        search=search,
        limit=limit,
        skip=skip,
    )
    docs = await repo.get_user_applications(user_id, filter_query)
    return docs


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application_by_id(
    app_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single application strictly owned by the authenticated seeker."""
    repo = ApplicationRepository(db)
    user_id = user["id"]
    doc = await repo.get_application_for_user(app_id, user_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return doc


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_data: ApplicationCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Submit a new job application record bound to the authenticated seeker."""
    repo = ApplicationRepository(db)
    doc_data = app_data.model_dump()
    user_id = user["id"]
    doc_data["userId"] = user_id

    if not doc_data.get("appliedDate"):
        doc_data["appliedDate"] = utc_now_iso().split("T")[0]

    # Synchronize backward-compatible aliases
    if doc_data.get("deadline") and not doc_data.get("deadlineDate"):
        doc_data["deadlineDate"] = doc_data["deadline"]
    elif doc_data.get("deadlineDate") and not doc_data.get("deadline"):
        doc_data["deadline"] = doc_data["deadlineDate"]

    if doc_data.get("company") and not doc_data.get("companyName"):
        doc_data["companyName"] = doc_data["company"]
    if doc_data.get("role") and not doc_data.get("roleTitle"):
        doc_data["roleTitle"] = doc_data["role"]

    created = await repo.create(doc_data)
    return created


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: str,
    app_data: ApplicationUpdate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing application stage, priority, or notes, ensuring ownership."""
    repo = ApplicationRepository(db)
    user_id = user["id"]

    update_dict = {k: v for k, v in app_data.model_dump().items() if v is not None}
    if update_dict.get("deadline") and not update_dict.get("deadlineDate"):
        update_dict["deadlineDate"] = update_dict["deadline"]
    elif update_dict.get("deadlineDate") and not update_dict.get("deadline"):
        update_dict["deadline"] = update_dict["deadlineDate"]

    updated = await repo.update_application_for_user(app_id, user_id, update_dict)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return updated


@router.delete("/{app_id}", response_model=StandardSuccessResponse)
async def delete_application(
    app_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete an application record, ensuring ownership."""
    repo = ApplicationRepository(db)
    user_id = user["id"]
    success = await repo.delete_application_for_user(app_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID '{app_id}' not found.",
        )
    return StandardSuccessResponse(success=True, message="Application record deleted.")
