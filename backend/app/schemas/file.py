from typing import Literal, Optional
from pydantic import BaseModel, Field

FilePurpose = Literal["resume", "chat_attachment", "profile_avatar", "other"]


class FileMetadataResponse(BaseModel):
    id: str
    ownerId: str
    originalFilename: str
    contentType: str
    size: int
    storageKey: str
    createdAt: str
    purpose: FilePurpose
    downloadUrl: str


class FileDeleteResponse(BaseModel):
    success: bool = True
    message: str = "File deleted successfully."
    fileId: str
