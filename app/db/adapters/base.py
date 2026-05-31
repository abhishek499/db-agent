from abc import ABC, abstractmethod

from app.models.schema import TableInfo, RelationshipInfo


class BaseDbAdapter(ABC):
    """
    Contract every DB adapter must fulfill.

    Phase A implements each concrete subclass.
    All methods are read-only — adapters never write to user data.
    """

    def __init__(self, db_uri: str) -> None:
        self.db_uri = db_uri

    @abstractmethod
    def test_connection(self) -> bool:
        """
        Attempt to open and immediately close a connection.
        Returns True on success, raises ConnectionError on failure.
        """
        ...

    @abstractmethod
    def get_tables(self) -> list[str]:
        """Return all table/collection names visible to the connection."""
        ...

    @abstractmethod
    def introspect_table(self, table_name: str) -> TableInfo:
        """
        Return column metadata for a single table/collection.
        Populates name, db_type, nullable, is_primary_key, is_foreign_key.
        label/description are left None — filled in during onboarding enrichment.
        """
        ...

    @abstractmethod
    def detect_relationships(self) -> list[RelationshipInfo]:
        """
        Best-effort auto-detection of FK relationships.
        SQL adapters query information_schema; MongoDB returns [].
        """
        ...

    @abstractmethod
    def execute_query(
        self,
        query: str,
        params: dict | None = None,
    ) -> tuple[list[str], list[list]]:
        """
        Execute a read-only query and return (column_names, rows).
        Raises ValueError if the query attempts a write operation.
        """
        ...

    @abstractmethod
    def close(self) -> None:
        """Release all connections/resources."""
        ...

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
