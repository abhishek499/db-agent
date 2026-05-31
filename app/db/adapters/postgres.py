from app.models.schema import TableInfo, RelationshipInfo
from ._sql_base import SQLAlchemyBase


class PostgresAdapter(SQLAlchemyBase):
    """PostgreSQL adapter using psycopg2 via SQLAlchemy."""

    def __init__(self, db_uri: str) -> None:
        super().__init__(
            db_uri,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=0,
        )
