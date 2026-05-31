"""
Shared fixtures for all test modules.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.auth.dependencies import get_optional_user, require_auth
from app.models.schema import User


# ---------------------------------------------------------------------------
# Autouse: isolate storage + bypass auth for every test
# ---------------------------------------------------------------------------

_TEST_USER = User(email="testuser@example.com", hashed_password="x")


@pytest.fixture(autouse=True)
def _isolate_storage(tmp_path, monkeypatch):
    """
    Each test gets its own temp agents directory and database_url is cleared so
    tests never touch PostgreSQL (even when DATABASE_URL is set in .env).
    """
    monkeypatch.setattr(settings, "database_url", "")
    monkeypatch.setattr(settings, "agents_dir", str(tmp_path))


@pytest.fixture(autouse=True)
def _mock_auth():
    """
    Override auth dependencies so tests don't need real JWT tokens.
    All requests are treated as coming from _TEST_USER.
    """
    app.dependency_overrides[require_auth] = lambda: _TEST_USER
    app.dependency_overrides[get_optional_user] = lambda: _TEST_USER
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """FastAPI test client — shared across session."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def tmp_agents_dir(tmp_path, monkeypatch):
    """
    Returns the already-isolated agents dir and ensures drafts/ exists.
    _isolate_storage already sets agents_dir; this fixture adds the drafts/
    subdirectory and returns the path for tests that need to write files directly.
    """
    monkeypatch.setattr(settings, "agents_dir", str(tmp_path))
    (tmp_path / "drafts").mkdir(exist_ok=True)
    return tmp_path


# ---------------------------------------------------------------------------
# Sample data helpers (used across multiple test files)
# ---------------------------------------------------------------------------

SQLITE_URI = "sqlite:///./tests/fixtures/sample.db"

SAMPLE_CONNECT_PAYLOAD = {
    "db_type": "sqlite",
    "db_uri": SQLITE_URI,
}
