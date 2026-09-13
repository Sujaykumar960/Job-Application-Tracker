from functools import lru_cache
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list, preventing dangerous wildcard with credentials."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip() and origin.strip() != "*"]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in origins and self.FRONTEND_ORIGIN != "*":
            origins.append(self.FRONTEND_ORIGIN)
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
