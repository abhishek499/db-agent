"""
Phase B unit tests for ScopeGuard and formatter.
No Claude API calls — pure logic only.
Integration test (real Claude + real SQLite) is skipped unless ANTHROPIC_API_KEY is set.
"""

import json
import os
import sqlite3
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pytest

from app.agent.formatter import _fallback, summarize_results, to_query_result
from app.agent.scope_guard import ScopeGuard
from app.models.api import QueryResult
from app.models.schema import (
    AgentConfig,
    AgentStatus,
    ColumnInfo,
    DbType,
    RelationshipInfo,
    SchemaKnowledge,
    ScopeMode,
    TableInfo,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(
    scope_mode: ScopeMode = ScopeMode.FULL_DB,
    user_id_column: str | None = None,
    db_type: DbType = DbType.SQLITE,
    db_uri: str = "sqlite:///test.db",
    global_prompt: str = "",
) -> AgentConfig:
    return AgentConfig(
        agent_id=str(uuid.uuid4()),
        name="test-agent",
        db_type=db_type,
        db_uri=db_uri,
        global_prompt=global_prompt,
        scope_mode=scope_mode,
        user_id_column=user_id_column,
        schema_knowledge=SchemaKnowledge(
            db_type=db_type,
            tables=[
                TableInfo(
                    name="orders",
                    label="Orders",
                    description="All customer orders",
                    columns=[
                        ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                        ColumnInfo(name="user_id", db_type="INTEGER", is_foreign_key=True),
                        ColumnInfo(name="total", db_type="REAL"),
                        ColumnInfo(name="status", db_type="TEXT"),
                    ],
                ),
                TableInfo(
                    name="users",
                    label="Users",
                    columns=[
                        ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                        ColumnInfo(name="email", db_type="TEXT"),
                    ],
                ),
            ],
            relationships=[
                RelationshipInfo(
                    from_table="orders",
                    from_column="user_id",
                    to_table="users",
                    to_column="id",
                    description="the customer who placed the order",
                )
            ],
        ),
        status=AgentStatus.ACTIVE,
    )


# ---------------------------------------------------------------------------
# ScopeGuard — FULL_DB
# ---------------------------------------------------------------------------

class TestScopeGuardFullDb:
    def test_returns_query_unchanged(self):
        guard = ScopeGuard(_make_config(ScopeMode.FULL_DB))
        q, p = guard.apply("SELECT * FROM orders", user_id=None)
        assert q == "SELECT * FROM orders"
        assert p == {}

    def test_ignores_user_id_when_full_db(self):
        guard = ScopeGuard(_make_config(ScopeMode.FULL_DB))
        q, p = guard.apply("SELECT * FROM orders", user_id="42")
        assert "42" not in q
        assert p == {}

    def test_multiline_query_unchanged(self):
        guard = ScopeGuard(_make_config(ScopeMode.FULL_DB))
        sql = "SELECT id, total\nFROM orders\nWHERE status = 'completed'"
        q, _ = guard.apply(sql, user_id=None)
        assert q == sql


# ---------------------------------------------------------------------------
# ScopeGuard — USER_SCOPED SQL
# ---------------------------------------------------------------------------

class TestScopeGuardUserScopedSql:
    def test_wraps_in_subquery(self):
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="orders.user_id")
        guard = ScopeGuard(config)
        q, p = guard.apply("SELECT * FROM orders", user_id="7")
        assert "SELECT * FROM" in q
        assert "_scoped" in q
        assert p == {"__scope_user_id": "7"}

    def test_strips_table_prefix_from_column(self):
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="orders.user_id")
        guard = ScopeGuard(config)
        q, _ = guard.apply("SELECT id, total FROM orders", user_id="9")
        assert "orders.user_id" not in q       # table prefix stripped
        assert "_scoped.user_id" in q          # bare column used in outer WHERE

    def test_plain_column_name_works(self):
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="user_id")
        guard = ScopeGuard(config)
        q, p = guard.apply("SELECT * FROM orders", user_id="5")
        assert "_scoped.user_id = :__scope_user_id" in q
        assert p["__scope_user_id"] == "5"

    def test_raises_without_user_id(self):
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="user_id")
        guard = ScopeGuard(config)
        with pytest.raises(ValueError, match="user_id is required"):
            guard.apply("SELECT * FROM orders", user_id=None)

    def test_user_id_is_parameterized_not_interpolated(self):
        """Ensure user_id value is never interpolated into the query string."""
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="user_id")
        guard = ScopeGuard(config)
        malicious_id = "1; DROP TABLE orders; --"
        q, p = guard.apply("SELECT * FROM orders", user_id=malicious_id)
        assert malicious_id not in q          # NOT in query text
        assert p["__scope_user_id"] == malicious_id  # safely in params


# ---------------------------------------------------------------------------
# ScopeGuard — USER_SCOPED MongoDB
# ---------------------------------------------------------------------------

class TestScopeGuardUserScopedMongo:
    def _mongo_config(self, col="orders.user_id"):
        return _make_config(
            scope_mode=ScopeMode.USER_SCOPED,
            user_id_column=col,
            db_type=DbType.MONGODB,
        )

    def test_prepends_match_stage(self):
        guard = ScopeGuard(self._mongo_config())
        pipeline_json = json.dumps({
            "collection": "orders",
            "pipeline": [{"$limit": 10}],
        })
        q, p = guard.apply(pipeline_json, user_id="abc")
        parsed = json.loads(q)
        assert parsed["pipeline"][0] == {"$match": {"user_id": "abc"}}
        assert parsed["pipeline"][1] == {"$limit": 10}
        assert p == {}

    def test_empty_pipeline_gets_match(self):
        guard = ScopeGuard(self._mongo_config())
        q, _ = guard.apply(
            json.dumps({"collection": "orders", "pipeline": []}),
            user_id="x",
        )
        parsed = json.loads(q)
        assert len(parsed["pipeline"]) == 1
        assert "$match" in parsed["pipeline"][0]

    def test_invalid_json_raises(self):
        guard = ScopeGuard(self._mongo_config())
        with pytest.raises(ValueError, match="Invalid MongoDB"):
            guard.apply("not-json", user_id="x")


# ---------------------------------------------------------------------------
# ScopeGuard — write detection (both scope modes)
# ---------------------------------------------------------------------------

class TestScopeGuardWriteDetection:
    @pytest.mark.parametrize("bad_query", [
        "DELETE FROM orders",
        "delete from orders",
        "INSERT INTO orders VALUES (1,2,3)",
        "UPDATE orders SET total=0",
        "DROP TABLE orders",
        "TRUNCATE orders",
        "CREATE TABLE x (id INT)",
        "ALTER TABLE orders ADD col TEXT",
    ])
    def test_blocks_write_queries_full_db(self, bad_query):
        guard = ScopeGuard(_make_config(ScopeMode.FULL_DB))
        with pytest.raises(ValueError, match="read-only"):
            guard.apply(bad_query, user_id=None)

    @pytest.mark.parametrize("bad_query", [
        "DELETE FROM orders",
        "INSERT INTO orders VALUES (1,2,3)",
    ])
    def test_blocks_write_queries_user_scoped(self, bad_query):
        config = _make_config(ScopeMode.USER_SCOPED, user_id_column="user_id")
        guard = ScopeGuard(config)
        with pytest.raises(ValueError, match="read-only"):
            guard.apply(bad_query, user_id="1")


# ---------------------------------------------------------------------------
# Formatter — to_query_result
# ---------------------------------------------------------------------------

class TestToQueryResult:
    def test_basic_passthrough(self):
        result = to_query_result(["id", "name"], [[1, "Alice"], [2, "Bob"]])
        assert result.columns == ["id", "name"]
        assert result.row_count == 2
        assert result.rows == [[1, "Alice"], [2, "Bob"]]

    def test_decimal_to_float(self):
        result = to_query_result(["price"], [[Decimal("9.99")], [Decimal("0.01")]])
        assert result.rows[0][0] == pytest.approx(9.99)
        assert result.rows[1][0] == pytest.approx(0.01)

    def test_datetime_to_iso(self):
        dt = datetime(2024, 3, 15, 10, 30, 0)
        result = to_query_result(["ts"], [[dt]])
        assert result.rows[0][0] == "2024-03-15T10:30:00"

    def test_date_to_iso(self):
        d = date(2024, 6, 1)
        result = to_query_result(["day"], [[d]])
        assert result.rows[0][0] == "2024-06-01"

    def test_bytes_to_hex(self):
        result = to_query_result(["data"], [[b"\xde\xad\xbe\xef"]])
        assert result.rows[0][0] == "deadbeef"

    def test_none_preserved(self):
        result = to_query_result(["val"], [[None]])
        assert result.rows[0][0] is None

    def test_bool_preserved(self):
        result = to_query_result(["flag"], [[True], [False]])
        assert result.rows[0][0] is True
        assert result.rows[1][0] is False

    def test_unknown_type_to_str(self):
        class Custom:
            def __str__(self):
                return "custom-repr"

        result = to_query_result(["x"], [[Custom()]])
        assert result.rows[0][0] == "custom-repr"

    def test_empty_input(self):
        result = to_query_result([], [])
        assert result.row_count == 0
        assert result.columns == []
        assert result.rows == []


# ---------------------------------------------------------------------------
# Formatter — summarize_results fallback (no API key needed)
# ---------------------------------------------------------------------------

class TestSummarizeResultsFallback:
    def test_no_results_message(self, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "anthropic_api_key", "")
        result = QueryResult(columns=[], rows=[], row_count=0)
        assert "No results" in summarize_results("q", "sql", result)

    def test_single_result_message(self, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "anthropic_api_key", "")
        result = QueryResult(columns=["id"], rows=[[1]], row_count=1)
        assert "1" in summarize_results("q", "sql", result)

    def test_multiple_results_include_count(self, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "anthropic_api_key", "")
        result = QueryResult(columns=["id"], rows=[[1], [2], [3]], row_count=3)
        assert "3" in summarize_results("q", "sql", result)


# ---------------------------------------------------------------------------
# Integration test — real Claude + real SQLite (skipped unless key set)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY"),
    reason="ANTHROPIC_API_KEY not set — skipping live integration test",
)
def test_query_engine_end_to_end(tmp_path):
    """Full pipeline: NL → Claude generates SQL → SQLite executes → answer returned."""
    from app.agent.query_engine import QueryEngine

    # Build a minimal SQLite DB
    db_path = tmp_path / "e2e.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL);
        INSERT INTO products VALUES (1, 'Widget', 9.99);
        INSERT INTO products VALUES (2, 'Gadget', 24.99);
        INSERT INTO products VALUES (3, 'Doohickey', 4.99);
    """)
    conn.close()

    config = _make_config(
        db_type=DbType.SQLITE,
        db_uri=f"sqlite:///{db_path}",
        global_prompt="You manage a small product catalog.",
    )
    # Replace schema with the products table
    config = config.model_copy(update={
        "schema_knowledge": SchemaKnowledge(
            db_type=DbType.SQLITE,
            tables=[
                TableInfo(
                    name="products",
                    label="Products",
                    description="Items sold in the store",
                    columns=[
                        ColumnInfo(name="id", db_type="INTEGER", is_primary_key=True),
                        ColumnInfo(name="name", db_type="TEXT", label="Product Name"),
                        ColumnInfo(name="price", db_type="REAL", label="Price (USD)"),
                    ],
                )
            ],
        )
    })

    engine = QueryEngine(config)
    answer, query, result = engine.run("How many products do we have?")

    assert result.row_count >= 1
    assert query.strip().lower().startswith("select")
    assert isinstance(answer, str) and len(answer) > 0
