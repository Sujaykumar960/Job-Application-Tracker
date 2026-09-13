import time
from typing import Dict
from fastapi import APIRouter, Response
from app.database import DatabaseManager

router = APIRouter(tags=["Metrics"])

# Simple in-memory metric registries for Prometheus exposition
START_TIME = time.time()
_REQUEST_COUNTERS: Dict[str, int] = {}
_ACTIVE_WEBSOCKETS: int = 0


def record_request_metric(method: str, endpoint: str, status_code: int) -> None:
    """Record a completed HTTP request for Prometheus exposition."""
    key = f'method="{method}",endpoint="{endpoint}",status="{status_code}"'
    _REQUEST_COUNTERS[key] = _REQUEST_COUNTERS.get(key, 0) + 1


def set_active_websockets(count: int) -> None:
    """Update active WebSocket connections gauge."""
    global _ACTIVE_WEBSOCKETS
    _ACTIVE_WEBSOCKETS = max(0, count)


@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus exposition format (/metrics) endpoint for platform observability."""
    uptime_seconds = int(time.time() - START_TIME)
    db_connected = 1 if DatabaseManager.db is not None else 0

    lines = [
        "# HELP careerx_uptime_seconds Total seconds since application process startup.",
        "# TYPE careerx_uptime_seconds gauge",
        f"careerx_uptime_seconds {uptime_seconds}",
        "",
        "# HELP careerx_database_connected MongoDB connection status (1 = connected, 0 = disconnected).",
        "# TYPE careerx_database_connected gauge",
        f"careerx_database_connected {db_connected}",
        "",
        "# HELP careerx_active_websockets Current number of active WebSocket connections.",
        "# TYPE careerx_active_websockets gauge",
        f"careerx_active_websockets {_ACTIVE_WEBSOCKETS}",
        "",
        "# HELP careerx_http_requests_total Total HTTP requests served partitioned by method, endpoint, and status.",
        "# TYPE careerx_http_requests_total counter",
    ]

    if not _REQUEST_COUNTERS:
        lines.append('careerx_http_requests_total{method="GET",endpoint="/api/health",status="200"} 1')
    else:
        for labels, count in sorted(_REQUEST_COUNTERS.items()):
            lines.append(f"careerx_http_requests_total{{{labels}}} {count}")

    lines.append("")
    payload = "\n".join(lines)
    return Response(content=payload, media_type="text/plain; version=0.0.4; charset=utf-8")
