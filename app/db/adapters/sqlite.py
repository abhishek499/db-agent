from app.models.schema import TableInfo, RelationshipInfo
from ._sql_base import SQLAlchemyBase


class SQLiteAdapter(SQLAlchemyBase):
    """SQLite adapter — primary adapter used for local dev and testing."""

    def __init__(self, db_uri: str) -> None:
        super().__init__(db_uri, connect_args={"check_same_thread": False})
