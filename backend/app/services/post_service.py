import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError

from app.config import settings
from app.repositories.file_repository import FileRepository
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.post import FeedPost, PostCreate
from app.storage import get_storage_backend
from app.utils.file_validation import validate_file_content
from app.utils.helpers import utc_now_iso


class PostService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.post_repo = PostRepository(db)
        self.user_repo = UserRepository(db)
        self.file_repo = FileRepository(db)

    async def create_post_from_request(
        self,
        request: Request,
        user: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Parse multipart form-data or JSON body to create feed post with media."""
        author_id = user["id"] if user else "usr_guest"
        profile_doc = await self.user_repo.get_profile(author_id) if user else None

        content_type = request.headers.get("content-type", "").lower()

        if "multipart/form-data" in content_type:
            return await self._create_from_multipart(request, author_id, user, profile_doc)
        else:
            return await self._create_from_json(request, author_id, user, profile_doc)

    async def _create_from_multipart(
        self,
        request: Request,
        author_id: str,
        user: Optional[Dict[str, Any]],
        profile_doc: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        form = await request.form()
        content = str(form.get("content") or "").strip()
        post_type = str(form.get("type") or "Technical Discussion")
        code_snippet = form.get("codeSnippet")
        if code_snippet is not None:
            code_snippet = str(code_snippet)

        # Parse tags
        tags: List[str] = []
        raw_tags = form.get("tags")
        if raw_tags:
            if isinstance(raw_tags, str):
                try:
                    parsed = json.loads(raw_tags)
                    if isinstance(parsed, list):
                        tags = [str(t).strip().lstrip("#") for t in parsed if str(t).strip()]
                    else:
                        tags = [t.strip().lstrip("#") for t in raw_tags.split(",") if t.strip()]
                except Exception:
                    tags = [t.strip().lstrip("#") for t in raw_tags.split(",") if t.strip()]
            elif isinstance(raw_tags, list):
                tags = [str(t).strip().lstrip("#") for t in raw_tags if str(t).strip()]

        # Collect files from "media" or "files"
        uploaded_files = []
        for key in ("media", "files"):
            for item in form.getlist(key):
                if hasattr(item, "filename") and hasattr(item, "read") and bool(item.filename):
                    uploaded_files.append(item)

        if len(uploaded_files) > settings.FEED_MAX_MEDIA_PER_POST:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {settings.FEED_MAX_MEDIA_PER_POST} media items allowed per post.",
            )

        storage = get_storage_backend()
        saved_storage_keys: List[str] = []
        media_items: List[Dict[str, Any]] = []

        try:
            for file in uploaded_files:
                data = await file.read()
                if not data:
                    continue

                filename = file.filename or "upload.bin"
                ext = Path(filename).suffix.lower()

                # Determine allowed size
                if ext in {".mp4", ".webm", ".mov"}:
                    max_size = settings.FEED_MAX_VIDEO_SIZE_BYTES
                else:
                    max_size = settings.FEED_MAX_IMAGE_SIZE_BYTES

                sanitized_name, mime_type = validate_file_content(
                    filename=filename,
                    content=data,
                    claimed_content_type=file.content_type,
                    max_size_bytes=max_size,
                )

                media_type = "video" if mime_type.startswith("video/") else "image"
                storage_key = f"posts/{author_id}/{uuid.uuid4().hex}{ext}"

                await storage.save(storage_key, data, mime_type)
                saved_storage_keys.append(storage_key)

                meta = await self.file_repo.create_file_metadata(
                    owner_id=author_id,
                    original_filename=sanitized_name,
                    content_type=mime_type,
                    size=len(data),
                    storage_key=storage_key,
                    purpose="feed_media",
                )

                media_items.append({
                    "id": meta["id"],
                    "type": media_type,
                    "url": f"/api/files/{meta['id']}",
                    "storageKey": storage_key,
                    "mimeType": mime_type,
                    "fileSizeBytes": len(data),
                    "originalFilename": sanitized_name,
                    "createdAt": utc_now_iso(),
                })

            if not content and not media_items:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Post must contain text content or at least one photo/video.",
                )

            try:
                post_input = PostCreate(
                    content=content,
                    type=post_type,  # type: ignore
                    tags=tags,
                    codeSnippet=code_snippet,
                    media=media_items,
                )
            except ValidationError as val_err:
                raise RequestValidationError(val_err.errors())

            return await self.post_repo.create_post_for_user(
                author_id=author_id,
                user_doc=user or {},
                profile_doc=profile_doc,
                post_data=post_input.model_dump(),
            )

        except Exception:
            # Orphan cleanup: delete any stored files if transaction failed
            for key in saved_storage_keys:
                try:
                    await storage.delete(key)
                except Exception:
                    pass
            raise

    async def _create_from_json(
        self,
        request: Request,
        author_id: str,
        user: Optional[Dict[str, Any]],
        profile_doc: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        try:
            body = await request.json()
        except Exception:
            body = {}

        try:
            post_input = PostCreate(**body)
        except ValidationError as val_err:
            raise RequestValidationError(val_err.errors())

        content = (post_input.content or "").strip()
        media_items = [m.model_dump() for m in post_input.media]

        if not content and not media_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post must contain text content or at least one photo/video.",
            )

        post_dict = post_input.model_dump()
        post_dict["content"] = content
        post_dict["media"] = media_items

        return await self.post_repo.create_post_for_user(
            author_id=author_id,
            user_doc=user or {},
            profile_doc=profile_doc,
            post_data=post_dict,
        )
