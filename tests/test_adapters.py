"""
Tests for DB adapters.

Phase A will implement these — they are written first (TDD).

SQLite is used as the primary test target because it requires no external
service. Postgres/MySQL/MongoDB tests are marked with skip decorators
that can be removed when a real connection is available.
"""

import pytest
import sqlite3
from pathlib import Path

from app.db.factory import get_adapter
from app.models.schema import DbType


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def sqlite_db(tmp_path) -> str:
    """Create a minimal SQLite database with two related tables."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TEXT
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT
        );

        INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', '2024-01-01');
        INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', '2024-01-02');
        INSERT INTO orders VALUES (1, 1, 99.99, 'completed', '2024-01-05');
        INSERT INTO orders VALUES (2, 1, 14.50, 'pending', '2024-01-06');
        INSERT INTO orders VALUES (3, 2, 250.00, 'completed', '2024-01-07');
    """)
    conn.close()
    return f"sqlite:///{db_path}"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def test_factory_returns_correct_adapter():
    adapter = get_adapter(DbType.SQLITE, "sqlite:///test.db")
    from app.db.adapters.sqlite import SQLiteAdapter
    assert isinstance(adapter, SQLiteAdapter)


def test_factory_raises_for_unknown_type():
    with pytest.raises(ValueError, match="Unsupported"):
        get_adapter("oracle", "oracle://...")  # type: ignore


# ---------------------------------------------------------------------------
# SQLite adapter
# ---------------------------------------------------------------------------

def test_sqlite_test_connection(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        assert adapter.test_connection() is True


def test_sqlite_get_tables(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        tables = adapter.get_tables()
    assert set(tables) == {"users", "orders"}


def test_sqlite_introspect_users(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        table = adapter.introspect_table("users")

    assert table.name == "users"
    col_names = [c.name for c in table.columns]
    assert "id" in col_names
    assert "email" in col_names

    id_col = next(c for c in table.columns if c.name == "id")
    assert id_col.is_primary_key is True


def test_sqlite_detect_relationships(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        rels = adapter.detect_relationships()

    assert len(rels) >= 1
    rel = rels[0]
    assert rel.from_table == "orders"
    assert rel.from_column == "user_id"
    assert rel.to_table == "users"
    assert rel.to_column == "id"


def test_sqlite_execute_query(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        cols, rows = adapter.execute_query("SELECT id, name FROM users ORDER BY id")

    assert cols == ["id", "name"]
    assert len(rows) == 2
    assert rows[0] == [1, "Alice"]


def test_sqlite_execute_query_with_params(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        cols, rows = adapter.execute_query(
            "SELECT id FROM orders WHERE user_id = :uid",
            params={"uid": 1},
        )
    assert len(rows) == 2


def test_sqlite_blocks_write_queries(sqlite_db):
    with get_adapter(DbType.SQLITE, sqlite_db) as adapter:
        with pytest.raises(ValueError, match="read-only"):
            adapter.execute_query("DELETE FROM users WHERE id = 1")


# ---------------------------------------------------------------------------
# Postgres (skip unless env var set)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not __import__("os").getenv("TEST_POSTGRES_URI"),
    reason="TEST_POSTGRES_URI not set",
)
def test_postgres_connection():
    uri = __import__("os").getenv("TEST_POSTGRES_URI")
    with get_adapter(DbType.POSTGRESQL, uri) as adapter:
        assert adapter.test_connection() is True
