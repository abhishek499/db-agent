import json
from datetime import datetime

from app.models.schema import ColumnInfo, RelationshipInfo, TableInfo
from .base import BaseDbAdapter


class MongoDbAdapter(BaseDbAdapter):
    """
    MongoDB adapter using PyMongo.
    "Tables" = collections; columns inferred by sampling up to 100 docs.
    Relationships always [] — MongoDB has no FK concept; user declares them manually.
    Query format: JSON string {"collection": "name", "pipeline": [...]}
    """

    def __init__(self, db_uri: str) -> None:
        super().__init__(db_uri)
        self._client = None
        self._db = None

    def _get_db(self):
        if self._client is None:
            from pymongo import MongoClient
            from pymongo.errors import ConfigurationError
            self._client = MongoClient(self.db_uri, serverSelectionTimeoutMS=5000)
            try:
                self._db = self._client.get_default_database()
            except ConfigurationError:
                raise ValueError(
                    "No database name found in the URI. "
                    "Add it before the '?': .../YOUR_DB_NAME?retryWrites=true&..."
                )
        return self._db

    def test_connection(self) -> bool:
        try:
            self._get_db().command("ping")
            return True
        except Exception as e:
            raise ConnectionError(f"MongoDB connection failed: {e}") from e

    def get_tables(self) -> list[str]:
        return self._get_db().list_collection_names()

    def introspect_table(self, table_name: str) -> TableInfo:
        db = self._get_db()
        sample = list(db[table_name].aggregate([{"$sample": {"size": 100}}]))

        field_types: dict[str, set[str]] = {}
        for doc in sample:
            for key, val in doc.items():
                field_types.setdefault(key, set()).add(type(val).__name__)

        columns = [
            ColumnInfo(
                name=field,
                db_type=" | ".join(sorted(types)),
                nullable=True,
                is_primary_key=(field == "_id"),
                is_foreign_key=False,
            )
            for field, types in field_types.items()
        ]
        return TableInfo(name=table_name, columns=columns)

    def detect_relationships(self) -> list[RelationshipInfo]:
        return []

    def execute_query(
        self,
        query: str,
        params: dict | None = None,
    ) -> tuple[list[str], list[list]]:
        """
        query must be a JSON string:
          {"collection": "orders", "pipeline": [{"$match": {...}}, {"$limit": 100}]}
        """
        try:
            query_obj = json.loads(query)
        except json.JSONDecodeError as e:
            raise ValueError(f"MongoDB query must be valid JSON: {e}") from e

        collection_name = query_obj.get("collection")
        pipeline = query_obj.get("pipeline", [])

        if not collection_name:
            raise ValueError("MongoDB query JSON must include a 'collection' key")

        db = self._get_db()
        docs = list(db[collection_name].aggregate(pipeline))

        if not docs:
            return [], []

        # Collect all keys preserving insertion order
        all_keys = list(dict.fromkeys(k for doc in docs for k in doc.keys()))

        rows = []
        for doc in docs:
            row = []
            for key in all_keys:
                val = doc.get(key)
                # Serialize non-JSON-safe types
                if hasattr(val, "__str__") and not isinstance(val, (int, float, bool, str, list, dict, type(None))):
                    val = str(val)
                row.append(val)
            rows.append(row)

        return all_keys, rows

    def close(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
