import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter per client IP."""

    def __init__(self, requests_limit: int = 20, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    async def __call__(self, request: Request) -> None:
        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "127.0.0.1")
        )
        now = time.time()
        window_start = now - self.window_seconds

        # Clean timestamps outside window
        timestamps = [ts for ts in self.requests[client_ip] if ts > window_start]
        self.requests[client_ip] = timestamps

        if len(timestamps) >= self.requests_limit:
            retry_after = int(window_start + self.window_seconds - now) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Limit is {self.requests_limit} requests per {self.window_seconds}s.",
                headers={"Retry-After": str(max(1, retry_after))},
            )

        self.requests[client_ip].append(now)


# Standard auth endpoint rate limiter: 30 requests per minute
auth_rate_limiter = SlidingWindowRateLimiter(requests_limit=30, window_seconds=60)
