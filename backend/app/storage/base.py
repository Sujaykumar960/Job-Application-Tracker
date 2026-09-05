from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional


class StorageBackend(ABC):
    """Abstract base interface for file storage backends (Local, S3, etc.)."""

    @abstractmethod
    async def save(self, key: str, data: bytes, content_type: str) -> str:
        """Persist file bytes to storage backend under the given key. Returns storage key."""
        pass

    @abstractmethod
    async def get(self, key: str) -> Optional[bytes]:
        """Retrieve complete file bytes for key if exists, else None."""
        pass

    @abstractmethod
    async def get_stream(self, key: str, chunk_size: int = 65536) -> AsyncGenerator[bytes, None]:
        """Stream file bytes chunk-by-chunk for memory efficiency."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Remove file from storage backend. Returns True if deleted, False otherwise."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if file exists in storage."""
        pass
