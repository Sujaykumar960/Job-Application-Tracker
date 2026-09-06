from functools import lru_cache
import secrets
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "CareerX Backend API"
    API_PREFIX: str = "/api"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "careerx_db"

    JWT_SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    FRONTEND_ORIGIN: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"

    # File Storage Configuration
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    STORAGE_BACKEND: str = "local"

    # AI & Groq LLM Configuration
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        """Require an explicitly configured strong signing key in production."""
        if self.ENVIRONMENT.lower() == "production":
            insecure_values = {
                "",
                "change-me",
                "change_me",
                "your-secret-key",
                "careerx_super_secret_jwt_key_change_in_production_2026_secure",
            }
            secret = (self.JWT_SECRET_KEY or "").strip()
            if len(secret) < 32 or secret.lower() in insecure_values:
                raise ValueError(
                    "JWT_SECRET_KEY must be a strong environment-provided secret "
                    "of at least 32 characters in production."
                )
        elif not self.JWT_SECRET_KEY:
            self.JWT_SECRET_KEY = "careerx-development-jwt-secret-key-32-chars-min-deterministic"
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in origins:
            origins.append(self.FRONTEND_ORIGIN)
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
