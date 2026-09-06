import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator, Optional

from app.config import settings
from app.storage.base import StorageBackend


class LocalFileStorage(StorageBackend):
    """Secure local disk storage backend.
    
    Prevents path traversal by strictly anchoring all operations inside base_dir.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_safe_path(self, key: str) -> Path:
        """Resolve path and ensure it does not escape base_dir."""
        # Strip leading slashes/backslashes to treat key as relative
        clean_key = key.lstrip("/\\")
        target_path = (self.base_dir / clean_key).resolve()
        try:
            target_path.relative_to(self.base_dir)
        except ValueError:
            raise ValueError(f"Path traversal detected: {key}")
        return target_path

    async def save(self, key: str, data: bytes, content_type: str) -> str:
        safe_path = self._get_safe_path(key)
        
        def _write():
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            safe_path.write_bytes(data)

        await asyncio.to_thread(_write)
        return key

    async def get(self, key: str) -> Optional[bytes]:
        safe_path = self._get_safe_path(key)
        if not await self.exists(key):
            return None
        return await asyncio.to_thread(safe_path.read_bytes)

    async def get_stream(self, key: str, chunk_size: int = 65536) -> AsyncGenerator[bytes, None]:
        safe_path = self._get_safe_path(key)
        if not await self.exists(key):
            return

        def _open_file():
            return open(safe_path, "rb")

        file_obj = await asyncio.to_thread(_open_file)
        try:
            while True:
                chunk = await asyncio.to_thread(file_obj.read, chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            await asyncio.to_thread(file_obj.close)

    async def delete(self, key: str) -> bool:
        safe_path = self._get_safe_path(key)
        if not await self.exists(key):
            return False

        def _remove():
            try:
                safe_path.unlink()
                return True
            except OSError:
                return False

        return await asyncio.to_thread(_remove)

    async def exists(self, key: str) -> bool:
        safe_path = self._get_safe_path(key)
        return await asyncio.to_thread(safe_path.is_file)
