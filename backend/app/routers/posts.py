from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_db, get_optional_user
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.post import (
    BookmarkResponse,
    CommentCreate,
    FeedComment,
    FeedFilterQuery,
    FeedPost,
    LikeResponse,
    PostCreate,
)

router = APIRouter(prefix="/posts", tags=["Social Engineering Feed"])


@router.get("", response_model=List[FeedPost])
async def get_posts(
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    authorId: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch social engineering feed posts (Backwards-compatible route)."""
    repo = PostRepository(db)
    filter_q = FeedFilterQuery(
        category=category,
        tag=tag,
        authorId=authorId,
        search=search,
        limit=limit,
        skip=skip,
    )
    current_uid = user["id"] if user else None
    return await repo.get_feed(filter_q, viewing_user_id=current_uid)


@router.post("", response_model=FeedPost, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Publish a new post to the community feed (Backwards-compatible route)."""
    repo = PostRepository(db)
    user_repo = UserRepository(db)

    author_id = user["id"] if user else "usr_guest"
    profile_doc = await user_repo.get_profile(author_id) if user else None

    return await repo.create_post_for_user(
        author_id=author_id,
        user_doc=user or {},
        profile_doc=profile_doc,
        post_data=post_data.model_dump(),
    )


@router.post("/{post_id}/like", response_model=LikeResponse)
async def toggle_like_post(
    post_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Like or unlike an engineering post."""
    repo = PostRepository(db)
    uid = user["id"] if user else "usr_guest"
    res = await repo.toggle_like(post_id, uid)
    return LikeResponse(**res)


@router.post("/{post_id}/comments", response_model=FeedComment)
async def add_comment(
    post_id: str,
    comment_data: CommentCreate,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add a comment to an engineering thread."""
    repo = PostRepository(db)
    user_repo = UserRepository(db)

    author_id = user["id"] if user else "usr_guest"
    author_name = "Alex Rivera"
    author_headline = "Distributed Systems Engineer"

    if user:
        profile = await user_repo.get_profile(author_id)
        if profile:
            author_name = profile.get("name") or author_name
            author_headline = profile.get("headline") or author_headline
        elif user.get("name"):
            author_name = user["name"]

    created = await repo.add_comment(
        post_id=post_id,
        author_id=author_id,
        author_name=author_name,
        author_headline=author_headline,
        content=comment_data.content,
    )
    return FeedComment(**created)


@router.post("/{post_id}/bookmark", response_model=BookmarkResponse)
async def toggle_bookmark_post(
    post_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Save or unsave a post to bookmarks."""
    repo = PostRepository(db)
    uid = user["id"] if user else "usr_guest"
    res = await repo.toggle_bookmark(post_id, uid)
    return BookmarkResponse(**res)
