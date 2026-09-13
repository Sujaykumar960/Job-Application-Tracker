from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_active_user, get_db, get_optional_user
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.services.notification_service import NotificationService
from app.services.post_service import PostService
from app.schemas.common import StandardSuccessResponse
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


@router.get("/saved", response_model=List[FeedPost])
async def get_saved_posts(
    user: Dict[str, Any] = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch posts bookmarked/saved by authenticated user."""
    repo = PostRepository(db)
    docs = await repo.find_many({"bookmarks": user["id"]}, sort=[("createdAt", -1)], limit=100)
    results = []
    for doc in docs:
        computed = dict(doc)
        likes = doc.get("likes", [])
        bookmarks = doc.get("bookmarks", [])
        comments = doc.get("comments", [])
        computed["likesCount"] = len(likes)
        computed["commentsCount"] = len(comments)
        computed["isLiked"] = user["id"] in likes
        computed["isSaved"] = True
        computed["sharesCount"] = doc.get("sharesCount", 0)
        results.append(computed)
    return results


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


@router.get("/user/{user_id}", response_model=List[FeedPost])
async def get_posts_by_user(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Fetch posts by a specific user for LinkedIn-style profile activity."""
    repo = PostRepository(db)
    filter_q = FeedFilterQuery(authorId=user_id, limit=limit, skip=skip)
    current_uid = user["id"] if user else None
    return await repo.get_feed(filter_q, viewing_user_id=current_uid)


@router.post("", response_model=FeedPost, status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Publish a new post to the community feed with text and media."""
    post_service = PostService(db)
    return await post_service.create_post_from_request(request, user)


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

    if res.get("isLiked") and user:
        post = await repo.get_by_id(post_id)
        if post and post.get("authorId") and post.get("authorId") != uid:
            user_repo = UserRepository(db)
            liker_prof = await user_repo.get_profile(uid)
            liker_name = (liker_prof and liker_prof.get("name")) or user.get("name") or "CareerX Engineer"
            snippet = post.get("content", "")[:60]
            await NotificationService.notify_post_liked(
                db,
                author_id=post["authorId"],
                liker_name=liker_name,
                post_id=post_id,
                post_snippet=snippet,
            )

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
    author_name = "CareerX Member"
    author_headline = "Engineer"

    if user:
        profile = await user_repo.get_profile(author_id)
        if profile:
            author_name = profile.get("name") or user.get("name") or author_name
            author_headline = profile.get("headline") or author_headline
        elif user.get("name"):
            author_name = user["name"]
        elif user.get("email"):
            author_name = user["email"].split("@")[0].capitalize()

    created = await repo.add_comment(
        post_id=post_id,
        author_id=author_id,
        author_name=author_name,
        author_headline=author_headline,
        content=comment_data.content,
    )

    if user:
        post = await repo.get_by_id(post_id)
        if post and post.get("authorId") and post.get("authorId") != author_id:
            await NotificationService.notify_post_commented(
                db,
                author_id=post["authorId"],
                commenter_name=author_name,
                post_id=post_id,
                comment_text=comment_data.content,
                comment_id=created.get("id"),
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


@router.delete("/{post_id}", response_model=StandardSuccessResponse)
async def delete_post(
    post_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a post (Author Only)."""
    repo = PostRepository(db)
    user_id = user["id"] if user else "usr_guest"
    await repo.delete_post_by_author(post_id, user_id)
    return StandardSuccessResponse(success=True, message="Post deleted successfully.")
