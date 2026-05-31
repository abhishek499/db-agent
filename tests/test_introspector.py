"""
Tests for SchemaIntrospector.
Phase A implements — written first (TDD).
"""

import sqlite3
import pytest

from app.onboarding.introspector import SchemaIntrospector
from app.models.schema import DbType


@pytest.fixture()
def sqlite_uri(tmp_path) -> str:
    db_path = tmp_path / "introspect_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL
        );
        CREATE TABLE reviews (
            id INTEGER PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            rating INTEGER,
            body TEXT
        );
    """)
    conn.close()
    return f"sqlite:///{db_path}"


def test_test_connection_succeeds(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    assert introspector.test_connection() is True


def test_test_connection_fails_bad_uri():
    introspector = SchemaIntrospector(DbType.SQLITE, "sqlite:///nonexistent_dir/x.db")
    with pytest.raises(ConnectionError):
        introspector.test_connection()


def test_introspect_returns_all_tables(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    knowledge = introspector.introspect()

    table_names = [t.name for t in knowledge.tables]
    assert "products" in table_names
    assert "reviews" in table_names


def test_introspect_sets_raw_introspected_at(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    knowledge = introspector.introspect()
    assert knowledge.raw_introspected_at is not None


def test_introspect_detects_relationships(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    knowledge = introspector.introspect()
    assert len(knowledge.relationships) >= 1


def test_introspect_columns_have_types(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    knowledge = introspector.introspect()

    products = next(t for t in knowledge.tables if t.name == "products")
    price_col = next(c for c in products.columns if c.name == "price")
    assert price_col.db_type != ""


def test_introspect_schema_labels_are_none_before_enrichment(sqlite_uri):
    introspector = SchemaIntrospector(DbType.SQLITE, sqlite_uri)
    knowledge = introspector.introspect()

    for table in knowledge.tables:
        assert table.label is None
        for col in table.columns:
            assert col.label is None
