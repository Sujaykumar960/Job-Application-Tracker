from typing import List, Literal, Optional
from pydantic import BaseModel, Field

PostType = Literal[
    "Achievement",
    "Project",
    "Certification",
    "Learning Update",
    "Career Advice",
    "Technical Discussion",
    "Job Announcement",
]


class FeedAuthor(BaseModel):
    name: str
    headline: str
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
    content: str = Field(..., min_length=1, max_length=15000, description="Post body")
    type: PostType = "Technical Discussion"
    tags: List[str] = Field(default_factory=list, max_length=20)
    codeSnippet: Optional[str] = Field(None, max_length=50000)


class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=15000)
    type: Optional[PostType] = None
    tags: Optional[List[str]] = Field(None, max_length=20)
    codeSnippet: Optional[str] = Field(None, max_length=50000)


class FeedPost(BaseModel):
    id: str
    author: FeedAuthor
    type: PostType
    createdAt: str
    content: str
    tags: List[str] = Field(default_factory=list)
    codeSnippet: Optional[str] = None
    likesCount: int = 0
    commentsCount: int = 0
    isLiked: bool = False
    isSaved: bool = False
    sharesCount: int = 0
    comments: List[FeedComment] = Field(default_factory=list)


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
