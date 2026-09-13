from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

PostType = Literal[
    "Achievement",
    "Project",
    "Certification",
    "Learning Update",
    "Career Advice",
    "Technical Discussion",
    "Job Announcement",
]


class PostMediaItem(BaseModel):
    id: str
    type: Literal["image", "video"]
    url: str
    storageKey: Optional[str] = None
    mimeType: str
    fileSizeBytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    originalFilename: Optional[str] = None
    createdAt: str


class FeedAuthor(BaseModel):
    id: Optional[str] = None
    name: str
    headline: str
    avatarUrl: Optional[str] = None
    avatarInitials: str = "CX"
    avatarGradient: Optional[str] = "from-brand-600 to-indigo-800"
    company: Optional[str] = None
    isVerified: bool = False


class FeedComment(BaseModel):
    id: str
    postId: Optional[str] = None
    authorId: Optional[str] = None
    authorName: str
    authorHeadline: str
    content: str
    createdAt: str


class FeedCommentResponse(FeedComment):
    pass


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=3000, description="Comment content")


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=3000, description="Updated comment content")


class PostCreate(BaseModel):
    content: Optional[str] = Field("", max_length=15000, description="Post body")
    type: PostType = "Technical Discussion"
    tags: List[str] = Field(default_factory=list, max_length=20)
    codeSnippet: Optional[str] = Field(None, max_length=50000)
    media: List[PostMediaItem] = Field(default_factory=list)


class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=15000)
    type: Optional[PostType] = None
    tags: Optional[List[str]] = Field(None, max_length=20)
    codeSnippet: Optional[str] = Field(None, max_length=50000)
    media: Optional[List[PostMediaItem]] = None


class FeedPost(BaseModel):
    id: str
    authorId: Optional[str] = None
    author: FeedAuthor
    type: PostType = "Technical Discussion"
    createdAt: str
    content: str
    media: List[PostMediaItem] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    codeSnippet: Optional[str] = None
    likesCount: int = 0
    commentsCount: int = 0
    isLiked: bool = False
    isSaved: bool = False
    sharesCount: int = 0
    comments: List[FeedComment] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def populate_author(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "author" not in data or not data["author"]:
                author_id = data.get("authorId") or data.get("userId")
                data["author"] = {
                    "id": author_id,
                    "name": data.get("authorName") or "CareerX Member",
                    "headline": data.get("authorHeadline") or "Software Engineer",
                    "avatarUrl": data.get("authorAvatar") or data.get("avatarUrl"),
                    "avatarInitials": "AS" if data.get("authorName") == "Alice Seeker" else "CX",
                    "avatarGradient": "from-brand-600 to-indigo-800",
                    "company": data.get("authorCompany") or data.get("company"),
                    "isVerified": False,
                }
            if not data.get("type"):
                data["type"] = "Technical Discussion"
        return data


# Backward-compatible alias
FeedPostResponse = FeedPost


class FeedFilterQuery(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None  # alias
    tag: Optional[str] = None
    tags: Optional[str] = None  # alias
    author: Optional[str] = None
    authorId: Optional[str] = None  # alias
    search: Optional[str] = None
    limit: int = 50
    skip: int = 0
    page: Optional[int] = None


# Backward-compatible alias
PostFilterQuery = FeedFilterQuery


class LikeResponse(BaseModel):
    likesCount: int
    isLiked: bool


class SaveResponse(BaseModel):
    isSaved: bool


class BookmarkResponse(BaseModel):
    isSaved: bool


class ShareResponse(BaseModel):
    sharesCount: int
