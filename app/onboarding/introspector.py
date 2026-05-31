from datetime import datetime, timezone

from app.db.factory import get_adapter
from app.models.schema import DbType, SchemaKnowledge


class SchemaIntrospector:
    """Drives initial schema discovery for a given DB connection."""

    def __init__(self, db_type: DbType, db_uri: str) -> None:
        self._db_type = db_type
        self._db_uri = db_uri

    def test_connection(self) -> bool:
        """
        Verify the URI is reachable.
        Returns True on success; raises ConnectionError on failure.
        """
        with get_adapter(self._db_type, self._db_uri) as adapter:
            return adapter.test_connection()

    def introspect(self) -> SchemaKnowledge:
        """
        Connect → fetch all tables → introspect each → detect relationships.
        Returns a raw (unenriched) SchemaKnowledge with raw_introspected_at set.
        Raises ConnectionError if the DB is unreachable.
        """
        with get_adapter(self._db_type, self._db_uri) as adapter:
            adapter.test_connection()
            table_names = adapter.get_tables()
            tables = [adapter.introspect_table(name) for name in table_names]
            relationships = adapter.detect_relationships()

        return SchemaKnowledge(
            db_type=self._db_type,
            tables=tables,
            relationships=relationships,
            raw_introspected_at=datetime.now(timezone.utc),
        )
