import asyncio
import logging
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, Request, status

from app.config import settings

logger = logging.getLogger("careerx.rate_limiter")

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    aioredis = None

_redis_pool: Optional[Any] = None


async def get_redis_client():
    """Lazily initialize and return shared Redis connection client for distributed rate limiting."""
    global _redis_pool
    if not settings.REDIS_URL or not REDIS_AVAILABLE:
        return None
    if _redis_pool is None:
        try:
            _redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            await _redis_pool.ping()
        except Exception as e:
            logger.warning("Could not connect to Redis at %s (%s). Falling back to in-memory limiter.", settings.REDIS_URL, e)
            _redis_pool = None
    return _redis_pool


def get_client_ip(request: Request) -> str:
    """Authoritatively determine client IP address.

    Security Policy:
    1. Inspect X-Real-IP: Set authoritatively by Nginx reverse proxy ($remote_addr).
    2. Inspect direct ASGI connection socket host (request.client.host).
    3. Fallback to rightmost hop of X-Forwarded-For (nearest proxy boundary).
    Never trust the leftmost X-Forwarded-For IP, which can be spoofed by clients.
    """
    # 1. Authoritative Nginx ingress header
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip and x_real_ip.strip():
        return x_real_ip.strip()

    # 2. Direct client socket address from ASGI connection
    if request.client and request.client.host:
        return request.client.host.strip()

    # 3. Nearest reverse proxy boundary from X-Forwarded-For
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        hops = [ip.strip() for ip in xff.split(",") if ip.strip()]
        if hops:
            return hops[-1]

    return "127.0.0.1"


class SlidingWindowRateLimiter:
    """Production-grade sliding window rate limiter supporting authoritative IP resolution,
    distributed Redis shared state for multi-worker Uvicorn instances, and bounded
    in-memory fallback when Redis is absent.
    """

    def __init__(self, requests_limit: int = 20, window_seconds: int = 60, name: str = "default"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.name = name
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def __call__(self, request: Request) -> None:
        if settings.ENVIRONMENT in ("testing", "e2e"):
            return

        client_ip = get_client_ip(request)
        now = time.time()
        window_start = now - self.window_seconds

        # 1. Distributed Redis sliding window when configured
        redis_conn = await get_redis_client()
        if redis_conn:
            try:
                key = f"rate_limit:{self.name}:{client_ip}"
                member = f"{now}_{time.perf_counter_ns()}"
                async with redis_conn.pipeline(transaction=True) as pipe:
                    pipe.zremrangebyscore(key, 0, window_start)
                    pipe.zcard(key)
                    pipe.zadd(key, {member: now})
                    pipe.expire(key, self.window_seconds + 5)
                    results = await pipe.execute()

                count_before_add = results[1]
                if count_before_add >= self.requests_limit:
                    retry_after = int(window_start + self.window_seconds - now) + 1
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests. Limit is {self.requests_limit} requests per {self.window_seconds}s.",
                        headers={"Retry-After": str(max(1, retry_after))},
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("Redis rate limiting failure (%s). Utilizing local fallback.", e)

        # 2. Local in-memory sliding window fallback with periodic pruning
        async with self._lock:
            if now - self._last_cleanup > 300:
                expired_ips = [
                    ip for ip, timestamps in self.requests.items()
                    if not timestamps or timestamps[-1] <= window_start
                ]
                for ip in expired_ips:
                    del self.requests[ip]
                self._last_cleanup = now

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
auth_rate_limiter = SlidingWindowRateLimiter(requests_limit=30, window_seconds=60, name="auth")

# Code execution is CPU-bound and spawns subprocesses: bound submissions per IP
# to avoid unbounded sandbox spend from a single client.
code_execution_rate_limiter = SlidingWindowRateLimiter(
    requests_limit=20, window_seconds=60, name="code_execution"
)
