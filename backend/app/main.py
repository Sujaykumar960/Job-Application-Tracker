import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import DatabaseManager
from app.middleware.error_handler import register_error_handlers
from app.routers.api_router import api_router

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
    try:
        await DatabaseManager.connect()
    except Exception as e:
        logger.error("Startup MongoDB connection failure: %s", e)
        # We don't exit hard so the server can still launch even if MongoDB starts shortly after
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)
    await DatabaseManager.disconnect()


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers matching frontend ApiErrorResponse format
register_error_handlers(app)

# Mount all API routes with common prefix /api
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    """Root metadata endpoint."""
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
