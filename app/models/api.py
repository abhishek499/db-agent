from pydantic import BaseModel, Field

from .schema import AccessMode, DbType, ScopeMode, RelationshipType, RelationshipInfo, TableInfo


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------

class ConnectRequest(BaseModel):
    db_type: DbType
    db_uri: str  # e.g. "postgresql://user:pass@host:5432/dbname"


class ConnectResponse(BaseModel):
    draft_id: str
    db_type: DbType
    tables_found: int
    message: str


class SchemaResponse(BaseModel):
    draft_id: str
    tables: list[TableInfo]
    relationships: list[RelationshipInfo]


class RelationshipBatch(BaseModel):
    """Replace (not append) all relationships on the draft."""
    relationships: list[RelationshipInfo]


class TableEnrichment(BaseModel):
    table_name: str
    label: str | None = None
    description: str | None = None


class ColumnEnrichment(BaseModel):
    table_name: str
    column_name: str
    label: str | None = None
    description: str | None = None


class EnrichSchemaRequest(BaseModel):
    """Partial enrichment — only supplied fields are updated."""
    tables: list[TableEnrichment] = Field(default_factory=list)
    columns: list[ColumnEnrichment] = Field(default_factory=list)


class FinalizeAgentRequest(BaseModel):
    name: str
    description: str = ""
    global_prompt: str
    scope_mode: ScopeMode = ScopeMode.FULL_DB
    user_id_column: str | None = None
    access_mode: AccessMode = AccessMode.PRIVATE
    allowed_users: list[str] = Field(default_factory=list)


class AgentSummary(BaseModel):
    agent_id: str
    name: str
    description: str
    db_type: DbType
    scope_mode: ScopeMode
    access_mode: AccessMode
    owner_id: str | None
    table_count: int
    status: str
    created_at: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    user_id: str
    email: str


class AgentDetail(BaseModel):
    """Editable fields for an active agent."""
    name: str
    description: str
    global_prompt: str
    scope_mode: ScopeMode
    user_id_column: str | None
    access_mode: AccessMode
    allowed_users: list[str]


class UpdateAgentRequest(BaseModel):
    name: str
    description: str = ""
    global_prompt: str
    scope_mode: ScopeMode = ScopeMode.FULL_DB
    user_id_column: str | None = None
    access_mode: AccessMode = AccessMode.PRIVATE
    allowed_users: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    user_id: str | None = None  # required when agent scope_mode=USER_SCOPED


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list]
    row_count: int


class ChatResponse(BaseModel):
    answer: str                    # natural language answer
    generated_query: str | None    # SQL or MQL that was executed
    results: QueryResult | None    # raw query results
    error: str | None = None


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class SuccessResponse(BaseModel):
    success: bool
    message: str


class ErrorDetail(BaseModel):
    error: str
    detail: str | None = None
