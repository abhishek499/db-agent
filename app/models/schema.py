from datetime import datetime, timezone
from enum import Enum
import uuid

from pydantic import BaseModel, Field


class DbType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    MONGODB = "mongodb"


class ScopeMode(str, Enum):
    USER_SCOPED = "user_scoped"  # auto-inject WHERE <user_id_column> = :user_id
    FULL_DB = "full_db"          # no implicit filter applied


class RelationshipType(str, Enum):
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_MANY = "many_to_many"


class AgentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"


class AccessMode(str, Enum):
    PRIVATE    = "private"     # owner only
    PUBLIC     = "public"      # anyone, no login needed
    LINK_ONLY  = "link_only"   # anyone with the URL, no login needed
    RESTRICTED = "restricted"  # specific users by email (login required)


class ColumnInfo(BaseModel):
    name: str
    db_type: str                          # raw type string from DB (e.g. "VARCHAR(255)", "int4")
    nullable: bool = True
    is_primary_key: bool = False
    is_foreign_key: bool = False
    label: str | None = None              # human-readable label, e.g. "Customer Email"
    description: str | None = None        # business meaning, e.g. "Email used for login"
    example_values: list[str] = Field(default_factory=list)


class TableInfo(BaseModel):
    name: str
    label: str | None = None              # human-readable name, e.g. "Customer Orders"
    description: str | None = None        # business meaning, e.g. "All orders placed by customers"
    columns: list[ColumnInfo] = Field(default_factory=list)
    estimated_row_count: int | None = None


class RelationshipInfo(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    relationship_type: RelationshipType = RelationshipType.ONE_TO_MANY
    description: str | None = None        # e.g. "the customer who placed this order"


class SchemaKnowledge(BaseModel):
    db_type: DbType
    tables: list[TableInfo] = Field(default_factory=list)
    relationships: list[RelationshipInfo] = Field(default_factory=list)
    raw_introspected_at: datetime | None = None
    enriched_at: datetime | None = None


class AgentConfig(BaseModel):
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    db_type: DbType
    db_uri: str                           # WARNING: sensitive — never log or expose
    global_prompt: str = ""               # system-level context injected into every query
    scope_mode: ScopeMode = ScopeMode.FULL_DB
    user_id_column: str | None = None     # e.g. "users.id" — required when scope_mode=USER_SCOPED
    schema_knowledge: SchemaKnowledge
    status: AgentStatus = AgentStatus.DRAFT
    # Ownership & access control
    owner_id: str | None = None           # user_id of the creator; None = legacy/unowned
    access_mode: AccessMode = AccessMode.PUBLIC   # PUBLIC default for backward compat
    allowed_users: list[str] = Field(default_factory=list)  # emails for RESTRICTED mode
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
