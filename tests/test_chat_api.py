"""
Tests for the chat API.
Phase B implements — written first (TDD).
Uses a pre-built agent fixture so no onboarding is required.
"""

import json
import sqlite3
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.models.schema import (
    AgentConfig, DbType, ScopeMode, AgentStatus,
    SchemaKnowledge, TableInfo, ColumnInfo, RelationshipInfo,
)

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_agents_dir(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "agents_dir", str(tmp_path))
    (tmp_path / "drafts").mkdir(exist_ok=True)
    return tmp_path


@pytest.fixture()
def sqlite_db(tmp_path) -> str:
    db_path = tmp_path / "chat_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            total REAL, status TEXT
        );
        INSERT INTO users VALUES (1, 'Alice', 'alice@example.com');
        INSERT INTO users VALUES (2, 'Bob', 'bob@example.com');
        INSERT INTO orders VALUES (1, 1, 100.0, 'completed');
        INSERT INTO orders VALUES (2, 2, 50.0, 'pending');
    """)
    conn.close()
    return f"sqlite:///{db_path}"


@pytest.fixture()
def active_agent(tmp_agents_dir, sqlite_db) -> AgentConfig:
    """Write a ready-made active agent to the temp agents dir."""
    agent_id = str(uuid.uuid4())
    config = AgentConfig(
        agent_id=agent_id,
        name="Test Agent",
        db_type=DbType.SQLITE,
        db_uri=sqlite_db,
        global_prompt="You are a test assistant.",
        scope_mode=ScopeMode.FULL_DB,
        schema_knowledge=SchemaKnowledge(
            db_type=DbType.SQLITE,
            tables=[
                TableInfo(
                    name="users",
                    label="Users",
                    description="All users",
                    columns=[
                        ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                        ColumnInfo(name="name", db_type="TEXT"),
                        ColumnInfo(name="email", db_type="TEXT"),
                    ],
                ),
                TableInfo(
                    name="orders",
                    label="Orders",
                    description="Customer orders",
                    columns=[
                        ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                        ColumnInfo(name="user_id", db_type="INTEGER", is_foreign_key=True),
                        ColumnInfo(name="total", db_type="REAL"),
                        ColumnInfo(name="status", db_type="TEXT"),
                    ],
                ),
            ],
            relationships=[
                RelationshipInfo(
                    from_table="orders",
                    from_column="user_id",
                    to_table="users",
                    to_column="id",
                    description="customer who placed the order",
                )
            ],
        ),
        status=AgentStatus.ACTIVE,
    )
    agent_path = Path(tmp_agents_dir) / f"{agent_id}.json"
    agent_path.write_text(config.model_dump_json())
    return config


@pytest.fixture()
def user_scoped_agent(tmp_agents_dir, sqlite_db) -> AgentConfig:
    agent_id = str(uuid.uuid4())
    config = AgentConfig(
        agent_id=agent_id,
        name="Scoped Agent",
        db_type=DbType.SQLITE,
        db_uri=sqlite_db,
        global_prompt="You are a user-specific assistant.",
        scope_mode=ScopeMode.USER_SCOPED,
        user_id_column="orders.user_id",
        schema_knowledge=SchemaKnowledge(
            db_type=DbType.SQLITE,
            tables=[
                TableInfo(name="orders", columns=[
                    ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                    ColumnInfo(name="user_id", db_type="INTEGER"),
                    ColumnInfo(name="total", db_type="REAL"),
                    ColumnInfo(name="status", db_type="TEXT"),
                ]),
            ],
        ),
        status=AgentStatus.ACTIVE,
    )
    agent_path = Path(tmp_agents_dir) / f"{agent_id}.json"
    agent_path.write_text(config.model_dump_json())
    return config


# ---------------------------------------------------------------------------
# GET /agents
# ---------------------------------------------------------------------------

def test_list_agents_returns_active_agents(tmp_agents_dir, active_agent):
    resp = client.get("/agents")
    assert resp.status_code == 200
    agents = resp.json()
    agent_ids = [a["agent_id"] for a in agents]
    assert active_agent.agent_id in agent_ids


def test_list_agents_does_not_expose_db_uri(tmp_agents_dir, active_agent):
    resp = client.get("/agents")
    for agent in resp.json():
        assert "db_uri" not in agent


# ---------------------------------------------------------------------------
# GET /agents/{agent_id}
# ---------------------------------------------------------------------------

def test_get_agent_returns_summary(tmp_agents_dir, active_agent):
    resp = client.get(f"/agents/{active_agent.agent_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Agent"


def test_get_agent_unknown_id_returns_404(tmp_agents_dir):
    resp = client.get("/agents/nonexistent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /agents/{agent_id}/chat — full DB scope
# ---------------------------------------------------------------------------

@patch("app.agent.query_engine.QueryEngine.run")
def test_chat_returns_answer(mock_run, tmp_agents_dir, active_agent):
    from app.models.api import QueryResult
    mock_run.return_value = (
        "There are 2 users.",
        "SELECT COUNT(*) FROM users",
        QueryResult(columns=["COUNT(*)"], rows=[[2]], row_count=1),
    )
    resp = client.post(f"/agents/{active_agent.agent_id}/chat", json={
        "message": "How many users are there?",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert data["generated_query"] == "SELECT COUNT(*) FROM users"
    assert data["error"] is None


@patch("app.agent.query_engine.QueryEngine.run")
def test_chat_unknown_agent_returns_404(mock_run, tmp_agents_dir):
    resp = client.post("/agents/nonexistent/chat", json={"message": "hello"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /agents/{agent_id}/chat — user scoped
# ---------------------------------------------------------------------------

@patch("app.agent.query_engine.QueryEngine.run")
def test_user_scoped_chat_requires_user_id(mock_run, tmp_agents_dir, user_scoped_agent):
    resp = client.post(f"/agents/{user_scoped_agent.agent_id}/chat", json={
        "message": "Show my orders",
        # user_id intentionally omitted
    })
    assert resp.status_code == 400


@patch("app.agent.query_engine.QueryEngine.run")
def test_user_scoped_chat_with_user_id(mock_run, tmp_agents_dir, user_scoped_agent):
    from app.models.api import QueryResult
    mock_run.return_value = (
        "You have 1 order.",
        "SELECT * FROM orders WHERE user_id = '1'",
        QueryResult(columns=["id", "total", "status"], rows=[[1, 100.0, "completed"]], row_count=1),
    )
    resp = client.post(f"/agents/{user_scoped_agent.agent_id}/chat", json={
        "message": "Show my orders",
        "user_id": "1",
    })
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# DELETE /agents/{agent_id}
# ---------------------------------------------------------------------------

def test_delete_agent(tmp_agents_dir, active_agent):
    resp = client.delete(f"/agents/{active_agent.agent_id}")
    assert resp.status_code == 200

    resp2 = client.get(f"/agents/{active_agent.agent_id}")
    assert resp2.status_code == 404
