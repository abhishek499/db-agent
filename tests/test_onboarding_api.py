"""
Tests for the onboarding API endpoints.
Phase A implements — written first (TDD).
Uses a SQLite fixture so no external DB is required.
"""

import sqlite3
import pytest

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def sqlite_uri(tmp_path) -> str:
    db_path = tmp_path / "onboarding_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE
        );
        CREATE TABLE invoices (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            amount REAL,
            paid INTEGER DEFAULT 0
        );
    """)
    conn.close()
    return f"sqlite:///{db_path}"


# ---------------------------------------------------------------------------
# POST /onboarding/connect
# ---------------------------------------------------------------------------

def test_connect_returns_draft_id(sqlite_uri):
    resp = client.post("/onboarding/connect", json={
        "db_type": "sqlite",
        "db_uri": sqlite_uri,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "draft_id" in data
    assert data["tables_found"] == 2


def test_connect_bad_uri_returns_400():
    # Use a path whose parent directory does not exist — SQLite cannot create it
    resp = client.post("/onboarding/connect", json={
        "db_type": "sqlite",
        "db_uri": "sqlite:///nonexistent_dir_xyz/missing.db",
    })
    assert resp.status_code in (400, 422)


def test_connect_invalid_db_type_returns_422():
    resp = client.post("/onboarding/connect", json={
        "db_type": "oracle",
        "db_uri": "oracle://...",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /onboarding/{draft_id}/schema
# ---------------------------------------------------------------------------

def test_get_schema_returns_tables(sqlite_uri):
    draft_id = client.post("/onboarding/connect", json={
        "db_type": "sqlite", "db_uri": sqlite_uri,
    }).json()["draft_id"]

    resp = client.get(f"/onboarding/{draft_id}/schema")
    assert resp.status_code == 200
    data = resp.json()
    table_names = [t["name"] for t in data["tables"]]
    assert "customers" in table_names
    assert "invoices" in table_names


def test_get_schema_unknown_draft_returns_404():
    resp = client.get("/onboarding/nonexistent-id/schema")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /onboarding/{draft_id}/relationships
# ---------------------------------------------------------------------------

def test_set_relationships(sqlite_uri):
    draft_id = client.post("/onboarding/connect", json={
        "db_type": "sqlite", "db_uri": sqlite_uri,
    }).json()["draft_id"]

    resp = client.put(f"/onboarding/{draft_id}/relationships", json={
        "relationships": [{
            "from_table": "invoices",
            "from_column": "customer_id",
            "to_table": "customers",
            "to_column": "id",
            "relationship_type": "one_to_many",
            "description": "the customer who owns this invoice",
        }]
    })
    assert resp.status_code == 200

    schema = client.get(f"/onboarding/{draft_id}/schema").json()
    assert len(schema["relationships"]) == 1
    assert schema["relationships"][0]["description"] == "the customer who owns this invoice"


# ---------------------------------------------------------------------------
# PUT /onboarding/{draft_id}/enrich
# ---------------------------------------------------------------------------

def test_enrich_table_and_column(sqlite_uri):
    draft_id = client.post("/onboarding/connect", json={
        "db_type": "sqlite", "db_uri": sqlite_uri,
    }).json()["draft_id"]

    resp = client.put(f"/onboarding/{draft_id}/enrich", json={
        "tables": [{"table_name": "customers", "label": "Customers", "description": "People who buy things"}],
        "columns": [{"table_name": "customers", "column_name": "email", "label": "Email Address"}],
    })
    assert resp.status_code == 200

    schema = client.get(f"/onboarding/{draft_id}/schema").json()
    customer_table = next(t for t in schema["tables"] if t["name"] == "customers")
    assert customer_table["label"] == "Customers"
    email_col = next(c for c in customer_table["columns"] if c["name"] == "email")
    assert email_col["label"] == "Email Address"


# ---------------------------------------------------------------------------
# POST /onboarding/{draft_id}/finalize
# ---------------------------------------------------------------------------

def test_finalize_creates_active_agent(sqlite_uri, tmp_agents_dir):
    draft_id = client.post("/onboarding/connect", json={
        "db_type": "sqlite", "db_uri": sqlite_uri,
    }).json()["draft_id"]

    resp = client.post(f"/onboarding/{draft_id}/finalize", json={
        "name": "Invoice Agent",
        "description": "Query invoices by customer",
        "global_prompt": "You are a helpful billing assistant.",
        "scope_mode": "full_db",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Invoice Agent"
    assert data["status"] == "active"
    assert "agent_id" in data


def test_finalize_user_scoped_without_column_returns_400(sqlite_uri, tmp_agents_dir):
    draft_id = client.post("/onboarding/connect", json={
        "db_type": "sqlite", "db_uri": sqlite_uri,
    }).json()["draft_id"]

    resp = client.post(f"/onboarding/{draft_id}/finalize", json={
        "name": "Scoped Agent",
        "global_prompt": "...",
        "scope_mode": "user_scoped",
        "user_id_column": None,
    })
    assert resp.status_code == 400


@pytest.fixture()
def tmp_agents_dir(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "agents_dir", str(tmp_path))
    (tmp_path / "drafts").mkdir(exist_ok=True)
    return tmp_path
