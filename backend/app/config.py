from functools import lru_cache
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "CareerX Backend API"
    API_PREFIX: str = "/api"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "careerx_db"

    JWT_SECRET_KEY: str = "careerx_dev_secret_key_8f3d1b4a9e2c60751a8d0e7f4c3b2a19"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Explicit opt-in for development conveniences (token echo on password
    # reset, admin self-registration, on-host code execution). These must be
    # deliberately enabled; the ENVIRONMENT default is NOT enough, so a
    # production deployment that forgets ENVIRONMENT=production still fails
    # closed. Test environments opt in implicitly so CI keeps working.
    ENABLE_DEV_TOOLS: bool = False

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"

    # File Storage Configuration
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    RESUME_MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    FEED_MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    FEED_MAX_VIDEO_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    FEED_MAX_MEDIA_PER_POST: int = 5
    STORAGE_BACKEND: str = "local"

    # Groq AI Service Configuration (server-side only)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Code Execution Sandbox Service (isolated container runner)
    CODE_SANDBOX_URL: str = ""
    CODE_SANDBOX_TIMEOUT_SECONDS: float = 5.0

    # Redis Distributed Cache / Rate Limiting (optional)
    REDIS_URL: str = ""
    REQUIRE_REDIS: bool = False

    model_config = SettingsConfigDict(
        env_file=(
            str(Path(__file__).resolve().parent.parent / ".env"),
            "backend/.env",
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def dev_tools_enabled(self) -> bool:
        """Whether development conveniences are active.

        True only when ENABLE_DEV_TOOLS is set explicitly, or when running
        under an explicitly-configured test environment. The defaulted
        ENVIRONMENT="development" does NOT satisfy this, so a forgotten
        environment fails closed towards secure behavior.
        """
        if self.ENVIRONMENT.lower().strip() == "production":
            return False
        if self.ENABLE_DEV_TOOLS:
            return True
        return self.ENVIRONMENT.lower().strip() in ("test", "testing")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list, preventing dangerous wildcard with credentials."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip() and origin.strip() != "*"]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in origins and self.FRONTEND_ORIGIN != "*":
            origins.append(self.FRONTEND_ORIGIN)
        return origins

    def validate_production_secrets(self) -> None:
        """Fail fast when production starts with known-insecure secrets.

        The hardcoded defaults and the placeholders shipped in
        .env.production.example all produce forgeable tokens / broken
        integrations. Refuse to boot rather than serve under them.
        """
        if self.ENVIRONMENT != "production":
            return
        known_bad_jwt = {
            "careerx_dev_secret_key_8f3d1b4a9e2c60751a8d0e7f4c3b2a19",
            "change_me_to_fresh_64_char_hex_token",
            "careerx_super_secret_jwt_key_change_in_production_2026_secure",
        }
        if self.JWT_SECRET_KEY in known_bad_jwt or len(self.JWT_SECRET_KEY) < 32:
            raise RuntimeError(
                "Refusing to start: JWT_SECRET_KEY is a known default/placeholder or shorter than 32 chars. "
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"',
            )
        if self.GROQ_API_KEY and "your_groq" in self.GROQ_API_KEY.lower():
            raise RuntimeError("Refusing to start: GROQ_API_KEY is still the placeholder from .env.production.example.")
        if "<" in self.MONGODB_URI and "your_" in self.MONGODB_URI.lower():
            raise RuntimeError("Refusing to start: MONGODB_URI still contains placeholder credentials.")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
