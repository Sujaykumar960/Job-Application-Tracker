from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import StandardSuccessResponse
from app.schemas.post import (
    CommentCreate,
    CommentUpdate,
    FeedComment,
    FeedFilterQuery,
    FeedPost,
    LikeResponse,
    PostCreate,
    PostUpdate,
    SaveResponse,
    ShareResponse,
)

router = APIRouter(prefix="/feed", tags=["Social Engineering Feed"])


@router.get("/posts", response_model=List[FeedPost])
async def get_feed_posts(
    response: Response,
    type: Optional[str] = Query(None, description="Filter by exact post type"),
    category: Optional[str] = Query(None, description="Alias for type"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    tags: Optional[str] = Query(None, description="Alias for tag"),
    author: Optional[str] = Query(None, description="Filter by author name or ID"),
    authorId: Optional[str] = Query(None, description="Alias for author"),
    search: Optional[str] = Query(None, description="Search across content, tags, author"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    page: Optional[int] = Query(None, ge=1),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch social engineering feed posts with multi-facet filters and pagination."""
    repo = PostRepository(db)
    filter_q = FeedFilterQuery(
        type=type or category,
        tag=tag or tags,
        author=author or authorId,
        search=search,
        limit=limit,
        skip=skip,
        page=page,
    )

    total_count = await repo.count_posts(filter_q)
    viewing_uid = user["id"] if user else None
    docs = await repo.get_feed(filter_q, viewing_user_id=viewing_uid)

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Limit"] = str(limit)
    active_page = page if page is not None else (skip // limit) + 1
    response.headers["X-Page"] = str(active_page)
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    response.headers["X-Total-Pages"] = str(max(1, total_pages))

    return docs


@router.get("/posts/{post_id}", response_model=FeedPost)
async def get_post_by_id(
    post_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch single post details with dynamic viewer relationship state."""
    repo = PostRepository(db)
    viewing_uid = user["id"] if user else None
    post = await repo.get_post_details(post_id, viewing_user_id=viewing_uid)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with ID '{post_id}' not found.",
        )
    return post


@router.post("/posts", response_model=FeedPost, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Publish a new post to the community feed."""
    repo = PostRepository(db)
    user_repo = UserRepository(db)

    author_id = user["id"]
    profile_doc = await user_repo.get_profile(author_id)

    created = await repo.create_post_for_user(
        author_id=author_id,
        user_doc=user,
        profile_doc=profile_doc,
        post_data=post_data.model_dump(),
    )
    return created


@router.patch("/posts/{post_id}", response_model=FeedPost)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update an existing post (Author Only)."""
    repo = PostRepository(db)
    user_id = user["id"]
    updated = await repo.update_post_by_author(post_id, user_id, post_data.model_dump(exclude_unset=True))
    return updated


@router.delete("/posts/{post_id}", response_model=StandardSuccessResponse)
async def delete_post(
    post_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a post (Author Only)."""
    repo = PostRepository(db)
    user_id = user["id"]
    await repo.delete_post_by_author(post_id, user_id)
    return StandardSuccessResponse(success=True, message="Post deleted successfully.")


@router.post("/posts/{post_id}/like", response_model=LikeResponse)
async def add_post_like(
    post_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Like a post (Idempotent - avoids duplicate likes)."""
    repo = PostRepository(db)
    user_id = user["id"]
    res = await repo.add_like(post_id, user_id)
    return LikeResponse(**res)


@router.delete("/posts/{post_id}/like", response_model=LikeResponse)
async def remove_post_like(
    post_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unlike a post."""
    repo = PostRepository(db)
    user_id = user["id"]
    res = await repo.remove_like(post_id, user_id)
    return LikeResponse(**res)


@router.post("/posts/{post_id}/save", response_model=SaveResponse)
async def add_post_save(
    post_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Save a post to bookmarks (Idempotent - avoids duplicate saves)."""
    repo = PostRepository(db)
    user_id = user["id"]
    res = await repo.add_save(post_id, user_id)
    return SaveResponse(**res)


@router.delete("/posts/{post_id}/save", response_model=SaveResponse)
async def remove_post_save(
    post_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove a post from bookmarks."""
    repo = PostRepository(db)
    user_id = user["id"]
    res = await repo.remove_save(post_id, user_id)
    return SaveResponse(**res)


@router.get("/posts/{post_id}/comments", response_model=List[FeedComment])
async def get_post_comments(
    post_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch comments thread for a post."""
    repo = PostRepository(db)
    return await repo.get_comments(post_id)


@router.post("/posts/{post_id}/comments", response_model=FeedComment, status_code=status.HTTP_201_CREATED)
async def add_post_comment(
    post_id: str,
    comment_data: CommentCreate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add a comment to a post."""
    repo = PostRepository(db)
    user_repo = UserRepository(db)

    author_id = user["id"]
    author_name = "Alex Rivera"
    author_headline = "Distributed Systems Engineer"

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


@router.patch("/comments/{comment_id}", response_model=FeedComment)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Edit comment content (Comment Author Only)."""
    repo = PostRepository(db)
    user_id = user["id"]
    updated = await repo.update_comment(comment_id, user_id, comment_data.content)
    return FeedComment(**updated)


@router.delete("/comments/{comment_id}", response_model=StandardSuccessResponse)
async def delete_comment(
    comment_id: str,
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a comment (Comment Author or Post Author)."""
    repo = PostRepository(db)
    user_id = user["id"]
    await repo.delete_comment(comment_id, user_id)
    return StandardSuccessResponse(success=True, message="Comment deleted successfully.")


@router.post("/posts/{post_id}/share", response_model=ShareResponse)
async def share_post(
    post_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Track and increment post share count."""
    repo = PostRepository(db)
    res = await repo.increment_share(post_id)
    return ShareResponse(**res)
