from typing import Optional
from pydantic import BaseModel, Field
from app.utils.helpers import utc_now_iso


class NoteModel(BaseModel):
    id: Optional[str] = None
    applicationId: str
    userId: str
    content: str
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
