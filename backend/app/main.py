import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import DatabaseManager
from app.middleware.error_handler import register_error_handlers
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.logging_middleware import StructuredLoggingMiddleware
from app.routers.api_router import api_router
from app.routers.metrics import router as root_metrics_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("careerx.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: connect to MongoDB and setup indexes on startup, disconnect on shutdown."""
    logger.info("Starting up %s (env=%s)...", settings.APP_NAME, settings.ENVIRONMENT)

    # Fail fast if a production boot is carrying default/placeholder secrets.
    settings.validate_production_secrets()

    # Redis distributed rate limiting (with graceful in-memory fallback unless explicitly required)
    if settings.REDIS_URL:
        from app.middleware.rate_limiter import get_redis_client
        client = await get_redis_client()
        if not client:
            if settings.REQUIRE_REDIS:
                raise RuntimeError(f"Could not connect to Redis at configured REDIS_URL: {settings.REDIS_URL}")
            logger.warning("Could not connect to Redis at %s; falling back to in-memory rate limiter.", settings.REDIS_URL)
        else:
            try:
                await client.ping()
                logger.info("Connected to Redis distributed rate limiter successfully.")
            except Exception as e:
                if settings.REQUIRE_REDIS:
                    raise RuntimeError(f"Redis ping failed at {settings.REDIS_URL}: {e}")
                logger.warning("Redis ping failed at %s (%s); falling back to in-memory rate limiter.", settings.REDIS_URL, e)
    elif settings.REQUIRE_REDIS:
        raise RuntimeError("Production deployment requires REDIS_URL for distributed rate limiting.")
    else:
        logger.info("REDIS_URL not configured. Operating with high-performance in-memory sliding window rate limiter.")

    try:
        await DatabaseManager.connect()
        if DatabaseManager.db is not None:
            job_cnt = await DatabaseManager.db.jobs.count_documents({})
            if job_cnt == 0:
                from app.data.jobs import SEEDED_JOBS_100
                from pymongo import UpdateOne
                from app.utils.helpers import utc_now_iso
                ops = [
                    UpdateOne({"id": j["id"]}, {"$set": dict(j, createdAt=utc_now_iso(), updatedAt=utc_now_iso())}, upsert=True)
                    for j in SEEDED_JOBS_100
                ]
                if ops:
                    await DatabaseManager.db.jobs.bulk_write(ops, ordered=False)
                    logger.info("Auto-seeded 100 jobs on platform startup.")

            # Self-contained: a failure here must not skip the recruiter tenancy
            # backfill below, which is a data-correctness migration.
            try:
                from app.data.companies import SEEDED_COMPANIES
                from pymongo import UpdateOne
                from app.utils.helpers import utc_now_iso
                comp_cnt = await DatabaseManager.db.companies.count_documents({})
                if comp_cnt < len(SEEDED_COMPANIES):
                    comp_ops = [
                        UpdateOne(
                            {"id": c["id"]},
                            {"$set": dict(c, createdAt=utc_now_iso(), updatedAt=utc_now_iso())},
                            upsert=True,
                        )
                        for c in SEEDED_COMPANIES
                    ]
                    if comp_ops:
                        await DatabaseManager.db.companies.bulk_write(comp_ops, ordered=False)
                        logger.info("Auto-seeded/synced %d companies on platform startup.", len(SEEDED_COMPANIES))
            except Exception as seed_err:
                logger.warning("Company auto-seed skipped: %s", seed_err)

            try:
                from app.utils.tenancy import backfill_recruiter_company_membership
                backfilled = await backfill_recruiter_company_membership(DatabaseManager.db)
                if backfilled:
                    logger.info("Backfilled immutable recruiter company membership for %d recruiter(s).", backfilled)
            except Exception as mig_err:
                logger.warning("Recruiter membership backfill skipped: %s", mig_err)
    except Exception as e:
        logger.error("Startup MongoDB connection failure: %s", e)
        # We don't exit hard so the server can still launch even if MongoDB starts shortly after
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)
    await DatabaseManager.disconnect()
    try:
        from app.middleware import rate_limiter
        if rate_limiter._redis_pool is not None:
            await rate_limiter._redis_pool.aclose()
    except Exception:
        pass


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Production-oriented REST API and WebSocket Backend for CareerX Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^(https:\/\/(.*\.vercel\.app|.*\.onrender\.com)|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Register structured logging & correlation ID middleware
app.add_middleware(StructuredLoggingMiddleware)

# Register custom exception handlers matching frontend ApiErrorResponse format
register_error_handlers(app)

# Mount root metrics endpoint for external Prometheus scraping
app.include_router(root_metrics_router)

# Mount all API routes with common prefix /api
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root():
    """Root metadata endpoint. Supports HEAD for Render health checks."""
    return {
        "name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "status": "online",
        "apiPrefix": settings.API_PREFIX,
        "healthCheck": f"{settings.API_PREFIX}/health",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
