import re
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository
from app.schemas.post import FeedComment, FeedFilterQuery
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class PostRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "posts")
        self.comments_collection = db["comments"]
        self.profiles_collection = db["profiles"]
        self.users_collection = db["users"]

    def _build_filter_criteria(self, query: FeedFilterQuery) -> Dict[str, Any]:
        and_conditions: List[Dict[str, Any]] = []

        post_type = query.type or query.category
        if post_type and post_type.lower() != "all":
            and_conditions.append({"type": {"$regex": f"^{re.escape(post_type)}$", "$options": "i"}})

        target_tag = query.tag or query.tags
        if target_tag and target_tag.lower() != "all":
            and_conditions.append({"tags": {"$in": [target_tag]}})

        target_author = query.authorId or query.author
        if target_author and target_author.lower() != "all":
            and_conditions.append({
                "$or": [
                    {"authorId": target_author},
                    {"author.name": {"$regex": re.escape(target_author), "$options": "i"}},
                ]
            })

        if query.search:
            safe_s = re.escape(query.search)
            and_conditions.append({
                "$or": [
                    {"content": {"$regex": safe_s, "$options": "i"}},
                    {"tags": {"$in": [query.search]}},
                    {"author.name": {"$regex": safe_s, "$options": "i"}},
                ]
            })

        if not and_conditions:
            return {}
        if len(and_conditions) == 1:
            return and_conditions[0]
        return {"$and": and_conditions}

    async def count_posts(self, query: FeedFilterQuery) -> int:
        filter_q = self._build_filter_criteria(query)
        return await self.collection.count_documents(filter_q)

    async def get_feed(
        self,
        query: Optional[FeedFilterQuery] = None,
        viewing_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if query is None:
            query = FeedFilterQuery()
        filter_q = self._build_filter_criteria(query)

        skip = query.skip
        if query.page is not None and query.page > 0:
            skip = (query.page - 1) * query.limit

        # Newest-first ordering
        docs = await self.find_many(
            filter_q,
            sort=[("createdAt", -1)],
            limit=query.limit,
            skip=skip,
        )

        results = []
        for doc in docs:
            likes = doc.get("likes", [])
            bookmarks = doc.get("bookmarks", [])
            comments = doc.get("comments", [])

            computed = dict(doc)
            computed["likesCount"] = len(likes)
            computed["commentsCount"] = len(comments)
            computed["isLiked"] = (viewing_user_id in likes) if viewing_user_id else False
            computed["isSaved"] = (viewing_user_id in bookmarks) if viewing_user_id else False
            computed["sharesCount"] = doc.get("sharesCount", 0)
            results.append(computed)

        return results

    async def get_post_details(
        self,
        post_id: str,
        viewing_user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        doc = await self.get_by_id(post_id)
        if not doc:
            return None

        likes = doc.get("likes", [])
        bookmarks = doc.get("bookmarks", [])
        comments = doc.get("comments", [])

        computed = dict(doc)
        computed["likesCount"] = len(likes)
        computed["commentsCount"] = len(comments)
        computed["isLiked"] = (viewing_user_id in likes) if viewing_user_id else False
        computed["isSaved"] = (viewing_user_id in bookmarks) if viewing_user_id else False
        computed["sharesCount"] = doc.get("sharesCount", 0)
        return computed

    async def create_post_for_user(
        self,
        author_id: str,
        user_doc: Dict[str, Any],
        profile_doc: Optional[Dict[str, Any]],
        post_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        author_name = "Alex Rivera"
        author_headline = "Distributed Systems & Backend Platform Engineer"
        author_company = "Tech"
        avatar_initials = "AR"
        avatar_gradient = "from-brand-600 to-indigo-800"

        if profile_doc:
            author_name = profile_doc.get("name") or author_name
            author_headline = profile_doc.get("headline") or author_headline
            author_company = profile_doc.get("company") or author_company
            avatar_initials = profile_doc.get("avatarInitials") or "".join([p[0].upper() for p in author_name.split()[:2]])
            avatar_gradient = profile_doc.get("avatarGradient") or avatar_gradient
        elif user_doc:
            author_name = user_doc.get("name") or author_name
            avatar_initials = "".join([p[0].upper() for p in author_name.split()[:2]])

        doc = {
            "id": f"post_{uuid.uuid4().hex[:8]}",
            "authorId": author_id,
            "author": {
                "name": author_name,
                "headline": author_headline,
                "avatarInitials": avatar_initials,
                "avatarGradient": avatar_gradient,
                "company": author_company,
                "isVerified": True,
            },
            "type": post_data.get("type", "Technical Discussion"),
            "content": post_data.get("content", ""),
            "tags": post_data.get("tags", []),
            "codeSnippet": post_data.get("codeSnippet"),
            "likes": [],
            "bookmarks": [],
            "comments": [],
            "sharesCount": 0,
            "createdAt": utc_now_iso(),
        }

        created = await self.create(doc)
        created["likesCount"] = 0
        created["commentsCount"] = 0
        created["isLiked"] = False
        created["isSaved"] = False
        created["sharesCount"] = 0
        return created

    async def update_post_by_author(
        self,
        post_id: str,
        user_id: str,
        update_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        post = await self.get_by_id(post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post with ID '{post_id}' not found.",
            )

        if post.get("authorId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only edit your own posts.",
            )

        clean_update = {k: v for k, v in update_data.items() if v is not None}
        updated = await self.update(post_id, clean_update)
        return await self.get_post_details(post_id, viewing_user_id=user_id)

    async def delete_post_by_author(self, post_id: str, user_id: str) -> bool:
        post = await self.get_by_id(post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Post with ID '{post_id}' not found.",
            )

        if post.get("authorId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only delete your own posts.",
            )

        await self.delete(post_id)
        return True

    async def add_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Add user like avoiding duplicates with $addToSet."""
        query = self._build_id_query(post_id)
        res = await self.collection.find_one_and_update(
            query,
            {"$addToSet": {"likes": user_id}},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        likes = res.get("likes", [])
        return {"likesCount": len(likes), "isLiked": True}

    async def remove_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Remove user like with $pull."""
        query = self._build_id_query(post_id)
        res = await self.collection.find_one_and_update(
            query,
            {"$pull": {"likes": user_id}},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        likes = res.get("likes", [])
        return {"likesCount": len(likes), "isLiked": False}

    async def toggle_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        post = await self.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        likes = post.get("likes", [])
        if user_id in likes:
            return await self.remove_like(post_id, user_id)
        else:
            return await self.add_like(post_id, user_id)

    async def add_save(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Add user bookmark avoiding duplicates with $addToSet."""
        query = self._build_id_query(post_id)
        res = await self.collection.find_one_and_update(
            query,
            {"$addToSet": {"bookmarks": user_id}},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        return {"isSaved": True}

    async def remove_save(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """Remove user bookmark with $pull."""
        query = self._build_id_query(post_id)
        res = await self.collection.find_one_and_update(
            query,
            {"$pull": {"bookmarks": user_id}},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        return {"isSaved": False}

    async def toggle_bookmark(self, post_id: str, user_id: str) -> Dict[str, Any]:
        post = await self.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        bookmarks = post.get("bookmarks", [])
        if user_id in bookmarks:
            return await self.remove_save(post_id, user_id)
        else:
            return await self.add_save(post_id, user_id)

    async def increment_share(self, post_id: str) -> Dict[str, Any]:
        """Increment post share counter."""
        query = self._build_id_query(post_id)
        res = await self.collection.find_one_and_update(
            query,
            {"$inc": {"sharesCount": 1}},
            return_document=True,
        )
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        return {"sharesCount": res.get("sharesCount", 1)}

    async def get_comments(self, post_id: str) -> List[Dict[str, Any]]:
        post = await self.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        return post.get("comments", [])

    async def add_comment(
        self,
        post_id: str,
        author_id: Any = None,
        author_name: Optional[str] = None,
        author_headline: Optional[str] = None,
        content: Optional[str] = None,
        comment_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if isinstance(author_id, dict):
            d = author_id
            c_id = d.get("id") or f"c_{uuid.uuid4().hex[:8]}"
            author_id_val = d.get("authorId")
            author_name = d.get("authorName", "Alex Rivera")
            author_headline = d.get("authorHeadline", "Software Engineer")
            content = d.get("content", "")
            created_at = d.get("createdAt") or utc_now_iso()
        elif comment_dict:
            d = comment_dict
            c_id = d.get("id") or f"c_{uuid.uuid4().hex[:8]}"
            author_id_val = d.get("authorId") or author_id
            author_name = d.get("authorName", author_name or "Alex Rivera")
            author_headline = d.get("authorHeadline", author_headline or "Software Engineer")
            content = d.get("content", content or "")
            created_at = d.get("createdAt") or utc_now_iso()
        else:
            c_id = f"c_{uuid.uuid4().hex[:8]}"
            author_id_val = author_id
            author_name = author_name or "Alex Rivera"
            author_headline = author_headline or "Software Engineer"
            content = content or ""
            created_at = utc_now_iso()

        new_comment = {
            "id": c_id,
            "postId": post_id,
            "authorId": author_id_val,
            "authorName": author_name,
            "authorHeadline": author_headline,
            "content": content,
            "createdAt": created_at,
        }

        query = self._build_id_query(post_id)
        res = await self.collection.update_one(query, {"$push": {"comments": new_comment}})
        if res.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
        return new_comment

    async def update_comment(
        self,
        comment_id: str,
        user_id: str,
        content: str,
    ) -> Dict[str, Any]:
        """Update comment ensuring only comment author can modify."""
        post = await self.collection.find_one({"comments.id": comment_id})
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

        target_comment = next((c for c in post.get("comments", []) if c.get("id") == comment_id), None)
        if not target_comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

        if target_comment.get("authorId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only edit your own comment.",
            )

        await self.collection.update_one(
            {"comments.id": comment_id},
            {"$set": {"comments.$.content": content, "comments.$.updatedAt": utc_now_iso()}},
        )

        target_comment["content"] = content
        return target_comment

    async def delete_comment(self, comment_id: str, user_id: str) -> bool:
        """Delete comment ensuring either comment author or post author can delete."""
        post = await self.collection.find_one({"comments.id": comment_id})
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

        target_comment = next((c for c in post.get("comments", []) if c.get("id") == comment_id), None)
        if not target_comment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")

        # Both comment author and post author have deletion rights
        if target_comment.get("authorId") != user_id and post.get("authorId") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted. You can only delete your own comment.",
            )

        await self.collection.update_one(
            {"_id": post["_id"]},
            {"$pull": {"comments": {"id": comment_id}}},
        )
        return True
