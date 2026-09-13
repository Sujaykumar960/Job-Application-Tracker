import io
import pytest
import pytest_asyncio
import httpx

from app.database import DatabaseManager
from app.main import app
from app.storage import get_storage_backend


@pytest_asyncio.fixture
async def client():
    await DatabaseManager.connect()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    # Clean up test data
    db = DatabaseManager.db
    if db is not None:
        await db.posts.delete_many({"tags": {"$in": ["MediaTest", "ProfileTest"]}})
        await db.users.delete_many({"email": {"$regex": ".*@mediatest\\.io$"}})
        await db.files.delete_many({"ownerId": {"$regex": ".*@mediatest\\.io$"}})


async def register_user(client, email: str, name: str, role: str = "seeker"):
    res = await client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    data = res.json()
    return data["user"]["id"], data["access_token"]


# Valid magic byte payloads
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 100
MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 100
WEBM_BYTES = b"\x1a\x45\xdf\xa3" + b"\x00" * 100


@pytest.mark.asyncio
async def test_create_text_only_post(client):
    user_id, token = await register_user(client, "alice@mediatest.io", "Alice Walker")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post(
        "/api/feed/posts",
        headers=headers,
        json={
            "content": "Excited to share our new distributed consensus paper!",
            "type": "Technical Discussion",
            "tags": ["MediaTest", "Consensus"],
        },
    )
    assert res.status_code == 201
    post = res.json()
    assert post["content"] == "Excited to share our new distributed consensus paper!"
    assert post["author"]["id"] == user_id
    assert post["author"]["name"] == "Alice Walker"
    assert post["media"] == []


@pytest.mark.asyncio
async def test_create_image_post_multipart(client):
    user_id, token = await register_user(client, "bob@mediatest.io", "Bob Builder")
    headers = {"Authorization": f"Bearer {token}"}

    files = [
        ("media", ("architecture_diagram.png", PNG_BYTES, "image/png")),
    ]
    data = {
        "content": "Check out this system architecture diagram!",
        "type": "Project",
        "tags": "MediaTest, Architecture",
    }

    res = await client.post("/api/feed/posts", headers=headers, data=data, files=files)
    assert res.status_code == 201
    post = res.json()
    assert post["content"] == "Check out this system architecture diagram!"
    assert len(post["media"]) == 1
    media = post["media"][0]
    assert media["type"] == "image"
    assert media["mimeType"] == "image/png"
    assert media["url"].startswith("/api/files/")
    assert media["storageKey"] is not None

    # Verify physical file exists in storage
    storage = get_storage_backend()
    assert await storage.exists(media["storageKey"]) is True


@pytest.mark.asyncio
async def test_create_video_post_multipart(client):
    user_id, token = await register_user(client, "carol@mediatest.io", "Carol Danvers")
    headers = {"Authorization": f"Bearer {token}"}

    files = [
        ("media", ("demo_walkthrough.mp4", MP4_BYTES, "video/mp4")),
    ]
    data = {
        "content": "Live 60fps demo of our real-time issue tracker!",
        "type": "Project",
        "tags": "MediaTest, Demo",
    }

    res = await client.post("/api/feed/posts", headers=headers, data=data, files=files)
    assert res.status_code == 201
    post = res.json()
    assert len(post["media"]) == 1
    media = post["media"][0]
    assert media["type"] == "video"
    assert media["mimeType"] == "video/mp4"
    assert media["url"].startswith("/api/files/")


@pytest.mark.asyncio
async def test_create_photo_only_post(client):
    user_id, token = await register_user(client, "dave@mediatest.io", "Dave Miller")
    headers = {"Authorization": f"Bearer {token}"}

    files = [
        ("media", ("photo_only.png", PNG_BYTES, "image/png")),
    ]
    data = {
        "content": "",
        "type": "Project",
        "tags": "MediaTest",
    }

    res = await client.post("/api/feed/posts", headers=headers, data=data, files=files)
    assert res.status_code == 201
    post = res.json()
    assert post["content"] == ""
    assert len(post["media"]) == 1


@pytest.mark.asyncio
async def test_reject_empty_post_without_content_or_media(client):
    user_id, token = await register_user(client, "eve@mediatest.io", "Eve Empty")
    headers = {"Authorization": f"Bearer {token}"}

    # Multipart empty
    res = await client.post("/api/feed/posts", headers=headers, data={"content": ""})
    assert res.status_code == 400

    # JSON empty
    res_json = await client.post("/api/feed/posts", headers=headers, json={"content": "", "media": []})
    assert res_json.status_code == 400


@pytest.mark.asyncio
async def test_reject_invalid_magic_bytes(client):
    user_id, token = await register_user(client, "frank@mediatest.io", "Frank Fake")
    headers = {"Authorization": f"Bearer {token}"}

    # Claiming PNG but body is text
    fake_png = b"This is plain text not a PNG file header!"
    files = [("media", ("fake.png", fake_png, "image/png"))]
    res = await client.post("/api/feed/posts", headers=headers, data={"content": "Fake image"}, files=files)
    assert res.status_code == 400
    assert "signature mismatch" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reject_oversized_image(client):
    user_id, token = await register_user(client, "grace@mediatest.io", "Grace Giant")
    headers = {"Authorization": f"Bearer {token}"}

    # PNG magic bytes + 11MB payload
    huge_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * (11 * 1024 * 1024)
    files = [("media", ("huge.png", huge_png, "image/png"))]
    res = await client.post("/api/feed/posts", headers=headers, data={"content": "Too big"}, files=files)
    assert res.status_code == 413


@pytest.mark.asyncio
async def test_post_media_cleanup_on_post_delete(client):
    user_id, token = await register_user(client, "heidi@mediatest.io", "Heidi Delete")
    headers = {"Authorization": f"Bearer {token}"}

    files = [("media", ("delete_me.png", PNG_BYTES, "image/png"))]
    create_res = await client.post(
        "/api/feed/posts",
        headers=headers,
        data={"content": "Delete this with media", "tags": "MediaTest"},
        files=files,
    )
    assert create_res.status_code == 201
    post = create_res.json()
    storage_key = post["media"][0]["storageKey"]

    storage = get_storage_backend()
    assert await storage.exists(storage_key) is True

    # Delete the post
    del_res = await client.delete(f"/api/feed/posts/{post['id']}", headers=headers)
    assert del_res.status_code == 200

    # Verify media was deleted from storage
    assert await storage.exists(storage_key) is False


@pytest.mark.asyncio
async def test_user_cannot_delete_other_user_post(client):
    user_a_id, token_a = await register_user(client, "usera@mediatest.io", "User Alpha")
    user_b_id, token_b = await register_user(client, "userb@mediatest.io", "User Beta")

    # User A creates post
    create_res = await client.post(
        "/api/feed/posts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"content": "User A exclusive thought", "tags": ["MediaTest"]},
    )
    assert create_res.status_code == 201
    post_id = create_res.json()["id"]

    # User B tries to delete User A's post
    del_res = await client.delete(
        f"/api/feed/posts/{post_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_public_file_streaming_for_feed_media(client):
    user_id, token = await register_user(client, "streaming@mediatest.io", "Stream Tester")
    headers = {"Authorization": f"Bearer {token}"}

    files = [("media", ("public_pic.png", PNG_BYTES, "image/png"))]
    create_res = await client.post(
        "/api/feed/posts",
        headers=headers,
        data={"content": "Publicly visible image", "tags": "MediaTest"},
        files=files,
    )
    assert create_res.status_code == 201
    media_url = create_res.json()["media"][0]["url"]

    # Stream WITHOUT any Authorization header (like browser <img src="...">)
    stream_res = await client.get(media_url)
    assert stream_res.status_code == 200
    assert stream_res.headers["content-type"] == "image/png"
    assert stream_res.content == PNG_BYTES


@pytest.mark.asyncio
async def test_private_resume_streaming_blocked_without_auth(client):
    user_id, token = await register_user(client, "private@mediatest.io", "Private Tester")

    # Upload a private resume
    pdf_bytes = b"%PDF-1.4\n" + b"\x00" * 100
    files = [("file", ("my_resume.pdf", pdf_bytes, "application/pdf"))]
    up_res = await client.post(
        "/api/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"purpose": "resume"},
        files=files,
    )
    assert up_res.status_code == 201
    file_id = up_res.json()["id"]

    # Access WITHOUT auth header -> must be 401
    anon_res = await client.get(f"/api/files/{file_id}")
    assert anon_res.status_code == 401


@pytest.mark.asyncio
async def test_real_avatar_upload(client):
    user_id, token = await register_user(client, "avatar@mediatest.io", "Avatar Tester")
    headers = {"Authorization": f"Bearer {token}"}

    avatar_png = b"\x89PNG\r\n\x1a\n" + b"\x01" * 80
    files = [("avatar_file", ("my_face.png", avatar_png, "image/png"))]

    up_res = await client.post("/api/users/me/avatar", headers=headers, files=files)
    assert up_res.status_code == 200
    avatar_url = up_res.json()["avatarUrl"]
    assert avatar_url.startswith("/api/files/")

    # Avatar should be publicly streamable without Bearer token
    anon_avatar = await client.get(avatar_url)
    assert anon_avatar.status_code == 200
    assert anon_avatar.content == avatar_png


@pytest.mark.asyncio
async def test_get_public_profile_endpoint(client):
    user_id, token = await register_user(client, "publicprof@mediatest.io", "Sarah Connor")
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile fields
    await client.patch(
        "/api/users/me",
        headers=headers,
        json={
            "headline": "Lead Autonomous Systems Architect",
            "bio": "Building robust cyber-physical systems with Go and Rust.",
            "location": "Los Angeles, CA",
            "company": "Cyberdyne Systems",
            "skills": ["Rust", "Go", "Distributed Systems", "Robotics"],
        },
    )

    # Fetch public profile as an unauthenticated or other user
    pub_res = await client.get(f"/api/users/{user_id}/profile")
    assert pub_res.status_code == 200
    profile = pub_res.json()
    assert profile["id"] == user_id
    assert profile["name"] == "Sarah Connor"
    assert profile["headline"] == "Lead Autonomous Systems Architect"
    assert profile["bio"] == "Building robust cyber-physical systems with Go and Rust."
    assert profile["location"] == "Los Angeles, CA"
    assert profile["company"] == "Cyberdyne Systems"
    assert "Rust" in profile["skills"]
    # Verify sensitive fields are NOT present
    assert "passwordHash" not in profile
    assert "password" not in profile
    assert "email" not in profile

    # Non-existent user -> 404
    bad_res = await client.get("/api/users/non_existent_id_9999/profile")
    assert bad_res.status_code == 404


@pytest.mark.asyncio
async def test_get_user_posts_activity(client):
    user_a_id, token_a = await register_user(client, "author_a@mediatest.io", "Author Alpha")
    user_b_id, token_b = await register_user(client, "author_b@mediatest.io", "Author Beta")

    # User A publishes 2 posts
    await client.post(
        "/api/feed/posts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"content": "Alpha Post 1", "tags": ["ProfileTest"]},
    )
    await client.post(
        "/api/feed/posts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"content": "Alpha Post 2", "tags": ["ProfileTest"]},
    )

    # User B publishes 1 post
    await client.post(
        "/api/feed/posts",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"content": "Beta Post 1", "tags": ["ProfileTest"]},
    )

    # Query User A's posts via /feed/users/{id}/posts
    posts_res = await client.get(f"/api/feed/users/{user_a_id}/posts")
    assert posts_res.status_code == 200
    posts = posts_res.json()
    assert len(posts) == 2
    for p in posts:
        assert p["authorId"] == user_a_id

    # Query User A's posts via query param authorId
    filter_res = await client.get(f"/api/feed/posts?authorId={user_a_id}")
    assert filter_res.status_code == 200
    filtered = filter_res.json()
    assert len(filtered) == 2
    for p in filtered:
        assert p["authorId"] == user_a_id
