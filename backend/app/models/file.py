from typing import Literal, Optional
from pydantic import BaseModel, Field

from app.utils.helpers import utc_now_iso

FilePurpose = Literal["resume", "chat_attachment", "profile_avatar", "other"]


class FileModel(BaseModel):
    id: Optional[str] = None
    ownerId: str
    originalFilename: str
    contentType: str
    size: int
    storageKey: str
    purpose: FilePurpose = "other"
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
