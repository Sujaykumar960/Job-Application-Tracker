from typing import Optional
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    content: Optional[str] = None
    note: Optional[str] = None
    text: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    applicationId: str
    userId: str
    content: str
    createdAt: str
    updatedAt: Optional[str] = None
