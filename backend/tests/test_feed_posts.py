import httpx
import pytest
import pytest_asyncio

from app.database import DatabaseManager
from app.main import app


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.posts.delete_many({"tags": {"$in": ["TestFeed", "RedisTest", "TagA", "TagB"]}})
        await db.users.delete_many({"email": {"$regex": ".*@feedtest\\.io$"}})
        await db.profiles.delete_many({})


async def create_user_token(client, email: str, name: str) -> str:
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": "seeker",
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_post_type_validation(client):
    token = await create_user_token(client, "type.val@feedtest.io", "Type Validator")
    headers = {"Authorization": f"Bearer {token}"}

    # Valid PostType
    valid_payload = {
        "content": "Passed AWS Solutions Architect Professional exam!",
        "type": "Certification",
        "tags": ["TestFeed", "AWS"],
    }
    valid_res = await client.post("/api/feed/posts", json=valid_payload, headers=headers)
    assert valid_res.status_code == 201
    assert valid_res.json()["type"] == "Certification"

    # Invalid PostType
    invalid_payload = {
        "content": "Random post content...",
        "type": "InvalidPostType123",
        "tags": ["TestFeed"],
    }
    invalid_res = await client.post("/api/feed/posts", json=invalid_payload, headers=headers)
    assert invalid_res.status_code == 422


@pytest.mark.asyncio
async def test_feed_crud_and_author_permissions(client):
    token_a = await create_user_token(client, "author.a@feedtest.io", "Author Alice")
    token_b = await create_user_token(client, "author.b@feedtest.io", "Author Bob")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates a post
    post_payload = {
        "content": "Atomic sliding window rate limiter with Redis Lua scripts.",
        "type": "Technical Discussion",
        "tags": ["TestFeed", "RedisTest"],
        "codeSnippet": "redis.call('ZREMRANGEBYSCORE', key, 0, now - window)",
    }
    res = await client.post("/api/feed/posts", json=post_payload, headers=headers_a)
    assert res.status_code == 201
    post = res.json()
    post_id = post["id"]
    assert post["content"] == post_payload["content"]
    assert post["codeSnippet"] is not None

    # Alice reads post
    get_res = await client.get(f"/api/feed/posts/{post_id}", headers=headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == post_id

    # Bob attempts to edit Alice's post (Should be 403 Forbidden)
    patch_bob = await client.patch(
        f"/api/feed/posts/{post_id}",
        json={"content": "Hacked content by Bob"},
        headers=headers_b,
    )
    assert patch_bob.status_code == 403

    # Bob attempts to delete Alice's post (Should be 403 Forbidden)
    del_bob = await client.delete(f"/api/feed/posts/{post_id}", headers=headers_b)
    assert del_bob.status_code == 403

    # Alice successfully updates her post
    patch_alice = await client.patch(
        f"/api/feed/posts/{post_id}",
        json={"content": "Updated content with O(1) memory explanation."},
        headers=headers_a,
    )
    assert patch_alice.status_code == 200
    assert patch_alice.json()["content"] == "Updated content with O(1) memory explanation."

    # Alice successfully deletes her post
    del_alice = await client.delete(f"/api/feed/posts/{post_id}", headers=headers_a)
    assert del_alice.status_code == 200
    assert del_alice.json()["success"] is True

    # Confirm 404 after deletion
    verify_res = await client.get(f"/api/feed/posts/{post_id}")
    assert verify_res.status_code == 404


@pytest.mark.asyncio
async def test_likes_lifecycle_and_duplicate_prevention(client):
    token_a = await create_user_token(client, "liker.a@feedtest.io", "Liker Alice")
    token_b = await create_user_token(client, "liker.b@feedtest.io", "Liker Bob")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create post
    create_res = await client.post("/api/feed/posts", json={
        "content": "Deep dive into Raft leader election RPCs.",
        "type": "Technical Discussion",
        "tags": ["TestFeed"],
    }, headers=headers_a)
    post_id = create_res.json()["id"]

    # 1. Alice likes the post
    like1 = await client.post(f"/api/feed/posts/{post_id}/like", headers=headers_a)
    assert like1.status_code == 200
    assert like1.json()["likesCount"] == 1
    assert like1.json()["isLiked"] is True

    # 2. Alice likes again -> Should avoid duplicate (idempotent)
    like2 = await client.post(f"/api/feed/posts/{post_id}/like", headers=headers_a)
    assert like2.status_code == 200
    assert like2.json()["likesCount"] == 1
    assert like2.json()["isLiked"] is True

    # 3. Bob likes post -> Count becomes 2
    like3 = await client.post(f"/api/feed/posts/{post_id}/like", headers=headers_b)
    assert like3.status_code == 200
    assert like3.json()["likesCount"] == 2

    # 4. Alice unlikes post
    unlike1 = await client.delete(f"/api/feed/posts/{post_id}/like", headers=headers_a)
    assert unlike1.status_code == 200
    assert unlike1.json()["likesCount"] == 1
    assert unlike1.json()["isLiked"] is False


@pytest.mark.asyncio
async def test_saves_lifecycle_and_duplicate_prevention(client):
    token = await create_user_token(client, "saver@feedtest.io", "Saver User")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = await client.post("/api/feed/posts", json={
        "content": "Designing idempotency keys with distributed Redis locks.",
        "type": "Technical Discussion",
        "tags": ["TestFeed"],
    }, headers=headers)
    post_id = create_res.json()["id"]

    # 1. Save post
    save1 = await client.post(f"/api/feed/posts/{post_id}/save", headers=headers)
    assert save1.status_code == 200
    assert save1.json()["isSaved"] is True

    # 2. Save again -> Idempotent
    save2 = await client.post(f"/api/feed/posts/{post_id}/save", headers=headers)
    assert save2.status_code == 200
    assert save2.json()["isSaved"] is True

    # 3. Verify in GET post detail
    detail = await client.get(f"/api/feed/posts/{post_id}", headers=headers)
    assert detail.json()["isSaved"] is True

    # 4. Unsave post
    unsave = await client.delete(f"/api/feed/posts/{post_id}/save", headers=headers)
    assert unsave.status_code == 200
    assert unsave.json()["isSaved"] is False


@pytest.mark.asyncio
async def test_comments_lifecycle_and_author_protection(client):
    token_a = await create_user_token(client, "commenter.a@feedtest.io", "Alice Author")
    token_b = await create_user_token(client, "commenter.b@feedtest.io", "Bob Commenter")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Alice creates post
    post_res = await client.post("/api/feed/posts", json={
        "content": "Discussion on CRDT state sync.",
        "type": "Technical Discussion",
        "tags": ["TestFeed"],
    }, headers=headers_a)
    post_id = post_res.json()["id"]

    # Bob adds a comment
    comment_res = await client.post(
        f"/api/feed/posts/{post_id}/comments",
        json={"content": "Great post! How do you handle clock skew?"},
        headers=headers_b,
    )
    assert comment_res.status_code == 201
    comment = comment_res.json()
    comment_id = comment["id"]
    assert comment["content"] == "Great post! How do you handle clock skew?"

    # Fetch comments
    list_res = await client.get(f"/api/feed/posts/{post_id}/comments")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Alice tries to edit Bob's comment (Forbidden)
    edit_alice = await client.patch(
        f"/api/feed/comments/{comment_id}",
        json={"content": "Alice tampering with Bob's comment"},
        headers=headers_a,
    )
    assert edit_alice.status_code == 403

    # Bob edits his own comment (Allowed)
    edit_bob = await client.patch(
        f"/api/feed/comments/{comment_id}",
        json={"content": "Updated: We use hybrid logical clocks."},
        headers=headers_b,
    )
    assert edit_bob.status_code == 200
    assert edit_bob.json()["content"] == "Updated: We use hybrid logical clocks."

    # Bob deletes his comment
    del_bob = await client.delete(f"/api/feed/comments/{comment_id}", headers=headers_b)
    assert del_bob.status_code == 200
    assert del_bob.json()["success"] is True


@pytest.mark.asyncio
async def test_share_tracking(client):
    token = await create_user_token(client, "sharer@feedtest.io", "Sharer User")
    headers = {"Authorization": f"Bearer {token}"}

    post_res = await client.post("/api/feed/posts", json={
        "content": "Shareable architecture diagram on event brokers.",
        "type": "Project",
        "tags": ["TestFeed"],
    }, headers=headers)
    post_id = post_res.json()["id"]

    # Share once
    share1 = await client.post(f"/api/feed/posts/{post_id}/share")
    assert share1.status_code == 200
    assert share1.json()["sharesCount"] == 1

    # Share twice
    share2 = await client.post(f"/api/feed/posts/{post_id}/share")
    assert share2.status_code == 200
    assert share2.json()["sharesCount"] == 2


@pytest.mark.asyncio
async def test_filtering_and_pagination(client):
    token = await create_user_token(client, "filter.feed@feedtest.io", "Filter Tester")
    headers = {"Authorization": f"Bearer {token}"}

    # Seed posts with different types
    await client.post("/api/feed/posts", json={
        "content": "Launched a new open source library for GraphQL!",
        "type": "Project",
        "tags": ["TestFeed", "TagA"],
    }, headers=headers)

    await client.post("/api/feed/posts", json={
        "content": "Promoted to Senior Staff Engineer at Stripe!",
        "type": "Achievement",
        "tags": ["TestFeed", "TagB"],
    }, headers=headers)

    # Filter by type=Achievement
    res_type = await client.get("/api/feed/posts?type=Achievement")
    assert res_type.status_code == 200
    assert all(p["type"] == "Achievement" for p in res_type.json())

    # Filter by tag=TagA
    res_tag = await client.get("/api/feed/posts?tag=TagA")
    assert res_tag.status_code == 200
    assert any("TagA" in p["tags"] for p in res_tag.json())

    # Filter by search
    res_search = await client.get("/api/feed/posts?search=GraphQL")
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1

    # Test pagination headers
    res_page = await client.get("/api/feed/posts?tag=TestFeed&limit=1&page=1")
    assert res_page.status_code == 200
    assert len(res_page.json()) == 1
    assert "X-Total-Count" in res_page.headers
