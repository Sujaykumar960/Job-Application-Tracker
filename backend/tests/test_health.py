from starlette.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test health check returns status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_headers(client: TestClient):
    """Test CORS headers allow frontend origin."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_root_metadata(client: TestClient):
    """Test root endpoint returns metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["apiPrefix"] == "/api"
