from app.models.schema import DbType
from app.db.adapters.base import BaseDbAdapter
from app.db.adapters.postgres import PostgresAdapter
from app.db.adapters.mysql import MySQLAdapter
from app.db.adapters.sqlite import SQLiteAdapter
from app.db.adapters.mongodb import MongoDbAdapter

_ADAPTER_MAP: dict[DbType, type[BaseDbAdapter]] = {
    DbType.POSTGRESQL: PostgresAdapter,
    DbType.MYSQL: MySQLAdapter,
    DbType.SQLITE: SQLiteAdapter,
    DbType.MONGODB: MongoDbAdapter,
}


def get_adapter(db_type: DbType, db_uri: str) -> BaseDbAdapter:
    """
    Instantiate and return the correct adapter for the given db_type.
    Does NOT call test_connection — caller must do that explicitly.
    """
    cls = _ADAPTER_MAP.get(db_type)
    if cls is None:
        raise ValueError(f"Unsupported db_type: {db_type!r}")
    return cls(db_uri)
