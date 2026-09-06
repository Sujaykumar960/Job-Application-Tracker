from fastapi import APIRouter

from app.routers.ai import router as ai_router
from app.routers.applications import router as applications_router
from app.routers.auth import router as auth_router
from app.routers.calendar import router as calendar_router
from app.routers.code_execution import router as code_execution_router
from app.routers.companies import router as companies_router
from app.routers.dashboard import router as dashboard_router
from app.routers.feed import router as feed_router
from app.routers.files import router as files_router
from app.routers.health import router as health_router
from app.routers.jobs import router as jobs_router
from app.routers.messages import router as messages_router
from app.routers.network import router as network_router
from app.routers.notifications import router as notifications_router
from app.routers.posts import router as posts_router
from app.routers.progress import router as progress_router
from app.routers.questions import router as questions_router
from app.routers.recruiter import router as recruiter_router
from app.routers.resumes import router as resumes_router
from app.routers.search import router as search_router
from app.routers.users import router as users_router
from app.websocket.chat_ws import router as chat_ws_router

api_router = APIRouter()

# Register all modular sub-routers
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(calendar_router)
api_router.include_router(users_router)
api_router.include_router(applications_router)
api_router.include_router(resumes_router, prefix="/resumes")
api_router.include_router(resumes_router, prefix="/resume")
api_router.include_router(jobs_router)
api_router.include_router(questions_router)
api_router.include_router(code_execution_router)
api_router.include_router(progress_router)
api_router.include_router(feed_router)
api_router.include_router(posts_router)
api_router.include_router(network_router)
api_router.include_router(messages_router)
api_router.include_router(companies_router)
api_router.include_router(dashboard_router)
api_router.include_router(recruiter_router)
api_router.include_router(notifications_router)
api_router.include_router(ai_router)
api_router.include_router(files_router)
api_router.include_router(search_router)

# Register WebSocket endpoint under /api
api_router.include_router(chat_ws_router)
