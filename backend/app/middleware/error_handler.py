import logging
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("careerx.errors")


class AppException(Exception):
    """Base application business exception."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, detail: any = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail or message
        super().__init__(message)


def register_error_handlers(app: FastAPI) -> None:
    """Register uniform exception handlers matching frontend ApiErrorResponse interface."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "statusCode": exc.status_code,
                "message": exc.message,
                "detail": exc.detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "HTTP Error"
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "statusCode": exc.status_code,
                "message": message,
                "detail": exc.detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "statusCode": 422,
                "message": "Validation Error",
                "detail": exc.errors(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled Exception on %s %s: %s", request.method, request.url, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "Internal Server Error",
                "detail": "An unexpected error occurred. Please try again later.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
