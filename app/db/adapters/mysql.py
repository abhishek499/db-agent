from app.models.schema import TableInfo, RelationshipInfo
from ._sql_base import SQLAlchemyBase


class MySQLAdapter(SQLAlchemyBase):
    """MySQL adapter using PyMySQL via SQLAlchemy."""

    def __init__(self, db_uri: str) -> None:
        # Ensure PyMySQL dialect prefix
        uri = db_uri
        if uri.startswith("mysql://"):
            uri = uri.replace("mysql://", "mysql+pymysql://", 1)
        super().__init__(
            uri,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=0,
        )
