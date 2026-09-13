import json
import logging
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("careerx.access")


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that injects X-Request-ID, calculates response time, and outputs
    structured JSON logs for every request.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        # 1. Retrieve or generate correlation Request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # 2. Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_record = {
                "event": "http_request_exception",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown",
                "duration_ms": duration_ms,
                "error": str(exc),
            }
            logger.error(json.dumps(log_record))
            raise exc

        # 3. Calculate latency
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 4. Attach headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        # 5. Skip spamming logs on frequent health/metrics checks in production unless error
        is_health = request.url.path in ["/api/health", "/metrics"]
        if not is_health or response.status_code >= 400:
            log_record = {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")[:100],
            }
            if response.status_code >= 500:
                logger.error(json.dumps(log_record))
            elif response.status_code >= 400:
                logger.warning(json.dumps(log_record))
            else:
                logger.info(json.dumps(log_record))

        return response
