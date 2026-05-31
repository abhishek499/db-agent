"""
Shared fixtures for all test modules.
"""

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


@pytest.fixture(scope="session")
def client():
    """FastAPI test client — shared across session."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def tmp_agents_dir(tmp_path, monkeypatch):
    """
    Point the agent store at a fresh temp directory for each test.
    Prevents tests from polluting the real agents/ folder.
    """
    monkeypatch.setattr(settings, "agents_dir", str(tmp_path))
    (tmp_path / "drafts").mkdir()
    return tmp_path


# ---------------------------------------------------------------------------
# Sample data helpers (used across multiple test files)
# ---------------------------------------------------------------------------

SQLITE_URI = "sqlite:///./tests/fixtures/sample.db"

SAMPLE_CONNECT_PAYLOAD = {
    "db_type": "sqlite",
    "db_uri": SQLITE_URI,
}
