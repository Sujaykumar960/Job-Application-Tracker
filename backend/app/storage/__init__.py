from functools import lru_cache

from app.config import settings
from app.storage.base import StorageBackend
from app.storage.local import LocalFileStorage


@lru_cache()
def get_storage_backend() -> StorageBackend:
    """Storage backend factory. Configurable via settings.STORAGE_BACKEND."""
    backend_type = settings.STORAGE_BACKEND.lower()
    if backend_type == "local":
        return LocalFileStorage()
    # In production, S3Storage / GCSStorage would be returned here
    return LocalFileStorage()


__all__ = ["StorageBackend", "LocalFileStorage", "get_storage_backend"]
