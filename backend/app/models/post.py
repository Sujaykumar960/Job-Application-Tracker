from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.post import FeedAuthor
from app.utils.helpers import utc_now_iso


class FeedCommentModel(BaseModel):
    id: str
    authorId: Optional[str] = None
    authorName: str
    authorHeadline: str
    content: str
    createdAt: str = Field(default_factory=utc_now_iso)


class PostModel(BaseModel):
    id: Optional[str] = None
    authorId: str
    author: FeedAuthor
    type: str = "Technical Discussion"
    content: str
    tags: List[str] = Field(default_factory=list)
    codeSnippet: Optional[str] = None
    likes: List[str] = Field(default_factory=list)  # User IDs who liked
    bookmarks: List[str] = Field(default_factory=list)  # User IDs who bookmarked
    comments: List[FeedCommentModel] = Field(default_factory=list)
    sharesCount: int = 0
    createdAt: str = Field(default_factory=utc_now_iso)
    updatedAt: Optional[str] = None
