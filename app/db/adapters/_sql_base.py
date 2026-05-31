"""
Shared SQLAlchemy implementation for all relational DB adapters.
SQLite, PostgreSQL, and MySQL each subclass this with engine-specific kwargs.
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.models.schema import ColumnInfo, RelationshipInfo, RelationshipType, TableInfo
from .base import BaseDbAdapter

_WRITE_KEYWORDS = frozenset({
    "insert", "update", "delete", "drop", "truncate",
    "create", "alter", "replace", "upsert", "merge",
})


class SQLAlchemyBase(BaseDbAdapter):
    """Shared logic for all SQLAlchemy-backed adapters."""

    def __init__(self, db_uri: str, **engine_kwargs) -> None:
        super().__init__(db_uri)
        self._engine = None
        self._engine_kwargs = engine_kwargs

    def _get_engine(self):
        if self._engine is None:
            self._engine = create_engine(self.db_uri, **self._engine_kwargs)
        return self._engine

    def test_connection(self) -> bool:
        try:
            with self._get_engine().connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except (OperationalError, SQLAlchemyError, Exception) as e:
            raise ConnectionError(f"Cannot connect to database: {e}") from e

    def get_tables(self) -> list[str]:
        return inspect(self._get_engine()).get_table_names()

    def introspect_table(self, table_name: str) -> TableInfo:
        inspector = inspect(self._get_engine())
        pk_cols = set(
            inspector.get_pk_constraint(table_name).get("constrained_columns", [])
        )
        fk_cols = {
            fk["constrained_columns"][0]
            for fk in inspector.get_foreign_keys(table_name)
            if fk.get("constrained_columns")
        }
        columns = [
            ColumnInfo(
                name=col["name"],
                db_type=str(col["type"]),
                nullable=bool(col.get("nullable", True)),
                is_primary_key=col["name"] in pk_cols,
                is_foreign_key=col["name"] in fk_cols,
            )
            for col in inspector.get_columns(table_name)
        ]
        return TableInfo(name=table_name, columns=columns)

    def detect_relationships(self) -> list[RelationshipInfo]:
        inspector = inspect(self._get_engine())
        rels = []
        for table_name in inspector.get_table_names():
            for fk in inspector.get_foreign_keys(table_name):
                constrained = fk.get("constrained_columns", [])
                referred = fk.get("referred_columns", [])
                if not constrained or not referred:
                    continue
                rels.append(RelationshipInfo(
                    from_table=table_name,
                    from_column=constrained[0],
                    to_table=fk["referred_table"],
                    to_column=referred[0],
                    relationship_type=RelationshipType.ONE_TO_MANY,
                ))
        return rels

    def execute_query(
        self,
        query: str,
        params: dict | None = None,
    ) -> tuple[list[str], list[list]]:
        self._guard_write(query)
        with self._get_engine().connect() as conn:
            result = conn.execute(text(query), params or {})
            cols = list(result.keys())
            rows = [list(row) for row in result.fetchall()]
        return cols, rows

    def _guard_write(self, query: str) -> None:
        first = query.strip().split()[0].lower() if query.strip() else ""
        if first in _WRITE_KEYWORDS:
            raise ValueError(
                f"read-only adapter: write query not allowed ({first.upper()})"
            )

    def close(self) -> None:
        if self._engine:
            self._engine.dispose()
            self._engine = None
