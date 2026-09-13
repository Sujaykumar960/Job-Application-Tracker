import uuid
import pytest
from pymongo import MongoClient
from starlette.testclient import TestClient

from app.database import DatabaseManager
from app.main import app


def sync_cleanup_p12():
    client = MongoClient("mongodb://localhost:27017")
    db = client["careerx_db"]
    db.users.delete_many({"email": {"$regex": ".*@p12test\\.io$"}})
    db.profiles.delete_many({"userId": {"$regex": ".*p12.*"}})
    db.posts.delete_many({"content": {"$regex": ".*P12_TEST.*"}})
    db.audit_logs.delete_many({"event": {"$regex": ".*admin.*"}})


@pytest.fixture(scope="module", autouse=True)
def init_db_module():
    import asyncio
    asyncio.run(DatabaseManager.connect())
    sync_cleanup_p12()
    yield
    sync_cleanup_p12()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def register_user(client, email: str, name: str, role: str = "seeker"):
    res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"User registration failed: {res.text}"
    data = res.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    return user_id, {"Authorization": f"Bearer {token}"}


def test_structured_logging_and_correlation_headers(client):
    """Verify that incoming requests receive X-Request-ID and X-Response-Time headers."""
    res = client.get("/api/health")
    assert res.status_code == 200
    assert "X-Request-ID" in res.headers
    assert "X-Response-Time" in res.headers
    assert res.headers["X-Response-Time"].endswith("ms")

    # Custom request id propagation
    custom_id = "test-req-id-12345"
    res_custom = client.get("/api/health", headers={"X-Request-ID": custom_id})
    assert res_custom.status_code == 200
    assert res_custom.headers["X-Request-ID"] == custom_id


def test_prometheus_metrics_endpoint(client):
    """Verify Prometheus metrics exposition at root /metrics and /api/metrics."""
    # Root /metrics
    res_root = client.get("/metrics")
    assert res_root.status_code == 200
    assert "text/plain" in res_root.headers.get("content-type", "")
    assert "careerx_uptime_seconds" in res_root.text
    assert "careerx_database_connected" in res_root.text
    assert "careerx_http_requests_total" in res_root.text

    # Prefix /api/metrics
    res_api = client.get("/api/metrics")
    assert res_api.status_code == 200
    assert "careerx_uptime_seconds" in res_api.text


def test_deep_readiness_probe(client):
    """Verify deep readiness probe validates database and upload storage."""
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["ready"] is True
    assert data["checks"]["database"] == "healthy"
    assert data["checks"]["storage"] == "healthy"


def test_admin_rbac_protection(client):
    """Verify that seekers and recruiters are strictly forbidden from Admin API endpoints."""
    uid_seeker, seeker_hdr = register_user(client, "seeker_p12@p12test.io", "Seeker P12", role="seeker")
    uid_recruiter, recruiter_hdr = register_user(client, "recruiter_p12@p12test.io", "Recruiter P12", role="recruiter")

    # Seeker gets 403
    res_s = client.get("/api/admin/overview", headers=seeker_hdr)
    assert res_s.status_code == 403

    # Recruiter gets 403
    res_r = client.get("/api/admin/overview", headers=recruiter_hdr)
    assert res_r.status_code == 403

    # Unauthenticated gets 401
    res_anon = client.get("/api/admin/overview")
    assert res_anon.status_code in [401, 403]


def test_admin_overview_metrics(client):
    """Verify admin user can successfully view platform KPI metrics."""
    uid_admin, admin_hdr = register_user(client, "admin_p12@p12test.io", "Admin P12", role="admin")

    res = client.get("/api/admin/overview", headers=admin_hdr)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "system" in data
    metrics = data["metrics"]
    assert "totalUsers" in metrics
    assert "totalSeekers" in metrics
    assert "totalRecruiters" in metrics
    assert "totalAdmins" in metrics
    assert "totalJobs" in metrics
    assert "totalApplications" in metrics


def test_admin_user_management(client):
    """Verify admin user directory listing, query filtering, and status modification."""
    uid_admin, admin_hdr = register_user(client, "admin2_p12@p12test.io", "Admin Two P12", role="admin")
    uid_target, target_hdr = register_user(client, "target_p12@p12test.io", "Target User P12", role="seeker")

    # 1. List users
    res_list = client.get("/api/admin/users?limit=50", headers=admin_hdr)
    assert res_list.status_code == 200
    users_data = res_list.json()
    assert users_data["total"] >= 1
    assert any(u["id"] == uid_target for u in users_data["users"])

    # 2. Filter by role
    res_filter = client.get("/api/admin/users?role=seeker", headers=admin_hdr)
    assert res_filter.status_code == 200
    assert all(u["role"] == "seeker" for u in res_filter.json()["users"])

    # 3. Search query
    res_search = client.get("/api/admin/users?q=target_p12", headers=admin_hdr)
    assert res_search.status_code == 200
    assert len(res_search.json()["users"]) >= 1

    # 4. Modify user active status
    res_deactivate = client.patch(
        f"/api/admin/users/{uid_target}/status",
        headers=admin_hdr,
        json={"isActive": False},
    )
    assert res_deactivate.status_code == 200
    assert res_deactivate.json()["changes"]["isActive"] is False

    # 5. Prevent admin from deactivating self
    res_self = client.patch(
        f"/api/admin/users/{uid_admin}/status",
        headers=admin_hdr,
        json={"isActive": False},
    )
    assert res_self.status_code == 400
    assert "cannot deactivate" in res_self.text.lower()


def test_admin_content_moderation_and_audit(client):
    """Verify admin moderation queue, takedown operations, and audit trail."""
    uid_admin, admin_hdr = register_user(client, "admin3_p12@p12test.io", "Admin Three P12", role="admin")
    uid_seeker, seeker_hdr = register_user(client, "author_p12@p12test.io", "Author P12", role="seeker")

    # 1. Author publishes a post
    post_res = client.post(
        "/api/posts",
        headers=seeker_hdr,
        json={"content": "P12_TEST: Content scheduled for moderation test", "type": "Technical Discussion"},
    )
    assert post_res.status_code in [200, 201]
    post_id = post_res.json()["id"]

    # 2. Admin inspects moderation queue
    res_mod = client.get("/api/admin/moderation/posts", headers=admin_hdr)
    assert res_mod.status_code == 200
    assert any(p["id"] == post_id for p in res_mod.json()["posts"])

    # 3. Admin deletes post
    res_del = client.delete(
        f"/api/admin/moderation/posts/{post_id}?reason=Spam",
        headers=admin_hdr,
    )
    assert res_del.status_code == 200
    assert res_del.json()["postId"] == post_id

    # 4. Admin inspects audit trail
    res_audit = client.get("/api/admin/audit-logs", headers=admin_hdr)
    assert res_audit.status_code == 200
    audit_events = res_audit.json()["auditLogs"]
    assert any(a["event"] == "admin_post_takedown" for a in audit_events)
