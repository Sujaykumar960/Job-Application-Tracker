from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class StandardSuccessResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None


class ApiErrorResponse(BaseModel):
    statusCode: int
    message: str
    detail: Optional[Any] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
