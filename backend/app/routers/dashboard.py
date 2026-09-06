from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.schemas.dashboard import DashboardActivityResponse, DashboardOverviewResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve aggregated dashboard overview metrics computed directly from source collections."""
    service = DashboardService(db)
    return await service.get_overview(user["id"])


@router.get("/activity", response_model=DashboardActivityResponse)
async def get_dashboard_activity(
    limit: int = Query(20, ge=1, le=50, description="Max number of recent activity events to return"),
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Retrieve unified chronological activity stream spanning applications, messages, notifications, connections, and feed."""
    service = DashboardService(db)
    return await service.get_activity_feed(user["id"], limit=limit)
