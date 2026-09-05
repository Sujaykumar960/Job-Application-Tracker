import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """Synchronous test client for simple endpoint tests."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client():
    """Asynchronous HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Ensure test isolation so previous tests do not deplete rate limits."""
    from app.middleware.rate_limiter import auth_rate_limiter
    auth_rate_limiter.requests.clear()
