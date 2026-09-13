import os
import shutil
from pathlib import Path
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import DatabaseManager
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Liveness health check endpoint.
    Response: {"status": "ok"}
    """
    return HealthResponse(status="ok")


@router.get("/health/ready")
async def readiness_check():
    """Deep readiness probe validating database connectivity and upload directory writability."""
    checks = {}
    is_ready = True

    # 1. Database connectivity
    try:
        if DatabaseManager.client is not None:
            await DatabaseManager.client.admin.command("ping")
            checks["database"] = "healthy"
        else:
            checks["database"] = "disconnected"
            is_ready = False
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        is_ready = False

    # 2. Storage writability
    try:
        upload_path = Path(settings.UPLOAD_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
        test_file = upload_path / ".readiness_probe"
        test_file.write_text("ok")
        test_file.unlink()
        checks["storage"] = "healthy"
    except Exception as e:
        checks["storage"] = f"unhealthy: {str(e)}"
        is_ready = False

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ok" if is_ready else "degraded",
            "ready": is_ready,
            "environment": settings.ENVIRONMENT,
            "checks": checks,
        },
    )
