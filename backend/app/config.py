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
    STORAGE_BACKEND: str = "local"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

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
