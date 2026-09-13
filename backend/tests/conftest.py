import json
from unittest.mock import AsyncMock, patch
import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.main import app

DETERMINISTIC_GROQ_DATA = {
    "atsScore": 88,
    "percentile": 85,
    "targetProfile": "Senior Distributed Systems Engineer",
    "targetRole": "Distributed Systems Engineer",
    "keywords": ["Go", "Kafka", "Kubernetes", "Redis", "Distributed Systems"],
    "hardSkills": ["Go", "Python", "Kafka", "Redis", "Docker", "Kubernetes"],
    "atsBreakdown": {
        "overallScore": 88,
        "keywordsScore": 90,
        "impactScore": 85,
        "formattingScore": 92,
        "completenessScore": 86,
    },
    "pillars": [
        {
            "title": "Keywords & Hard Skills",
            "weight": "35% weight",
            "score": 90,
            "status": "optimal",
            "summary": "Strong alignment with distributed systems and backend technologies.",
        },
        {
            "title": "Impact & Metrics",
            "weight": "30% weight",
            "score": 85,
            "status": "good",
            "summary": "Solid quantifiable metrics on throughput and rate limiting.",
        },
        {
            "title": "Formatting & Readability",
            "weight": "20% weight",
            "score": 92,
            "status": "optimal",
            "summary": "Linear parseable layout with standard header hierarchy.",
        },
        {
            "title": "Section Completeness",
            "weight": "15% weight",
            "score": 86,
            "status": "good",
            "summary": "Key technical sections and contact credentials fully present.",
        },
    ],
    "strengths": [
        "Strong action verbs leading technical impact bullets.",
        "Clear demonstration of concurrent languages (Go, Python).",
    ],
    "weaknesses": [
        "Could expand on cloud infrastructure topologies (AWS ECS, Kubernetes).",
    ],
    "optimizationAreas": [
        "Cloud infrastructure topologies (AWS ECS, Kubernetes)",
        "Automated CI/CD pipeline metrics",
    ],
    "missingKeywords": [
        {"name": "Kubernetes", "priority": "High", "category": "DevOps & Cloud"},
        {"name": "OpenTelemetry", "priority": "Medium", "category": "Observability"},
    ],
    "extractedSkills": {
        "Languages": ["Go", "Python"],
        "Databases & Storage": ["Redis", "Kafka"],
        "Architecture": ["Distributed Systems", "Microservices"],
    },
    "bulletImprovements": [
        {
            "id": "b-1",
            "section": "Work Experience",
            "original": "Built high throughput distributed rate limiter processing 10k req/sec.",
            "optimized": "Architected a distributed sliding-window rate limiter in Go, handling 10k req/sec with zero packet loss.",
            "rationale": "Applies STAR framing and clarifies algorithmic mechanism.",
            "scoreImpact": "+4% Impact Score",
        }
    ],
    "experienceRewrites": [
        {
            "id": "rew-1",
            "role": "Senior Backend Engineer",
            "original": "Built high throughput distributed rate limiter processing 10k req/sec.",
            "rewritten": "Architected a distributed sliding-window rate limiter in Go, handling 10k req/sec with zero packet loss.",
            "impact": "+4% ATS Match",
        }
    ],
    "projects": [
        {
            "name": "Distributed Rate Limiter",
            "techStack": ["Go", "Redis", "Docker"],
            "description": "Sliding-window token bucket rate limiter for low latency API gateways.",
        }
    ],
    "education": [
        {
            "degree": "B.S. in Computer Science",
            "institution": "University of Washington",
            "year": "2024",
        }
    ],
    "recommendations": [
        "Specify latency percentiles (e.g. p99 latency) for the rate limiter service.",
    ],
    "formattingRecommendations": [
        "Maintain single-column hierarchy throughout the document.",
        "Ensure standard ATS section headers are formatted cleanly.",
    ],
    "formattingHealth": [
        {"label": "Single-Column Linear Hierarchy", "status": "Passed", "detail": "100% parseable standard headers."},
    ],
}


class MockMessage:
    def __init__(self, content):
        self.content = content


class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)


class MockResponse:
    def __init__(self, content_dict):
        self.choices = [MockChoice(json.dumps(content_dict))]


@pytest.fixture
def mock_deterministic_groq():
    """Mock ONLY the external Groq API boundary (chat.completions.create),
    returning deterministic valid structured data for security, ownership,
    and cascade tests without hitting external rate limits.
    """
    with patch("app.config.settings.GROQ_API_KEY", "gsk_test_mock_deterministic_key"):
        with patch(
            "groq.resources.chat.completions.AsyncCompletions.create",
            AsyncMock(return_value=MockResponse(DETERMINISTIC_GROQ_DATA)),
        ) as mock_create:
            yield mock_create


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

