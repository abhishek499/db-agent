from fastapi import APIRouter, Depends, HTTPException

from app.models.api import (
    AgentSummary,
    ConnectRequest,
    ConnectResponse,
    EnrichSchemaRequest,
    FinalizeAgentRequest,
    RelationshipBatch,
    SchemaResponse,
    SuccessResponse,
)
from app.auth.dependencies import require_auth
from app.models.schema import AgentConfig, User
from app.onboarding.introspector import SchemaIntrospector
from app.onboarding.schema_store import SchemaStore
from app.storage.agent_store import AgentStore

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _store() -> AgentStore:
    return AgentStore()


# ---------------------------------------------------------------------------
# Step 1 — connect + introspect
# ---------------------------------------------------------------------------

@router.post("/connect", response_model=ConnectResponse)
async def connect(body: ConnectRequest, current_user: User = Depends(require_auth)):
    """
    Test DB connection, introspect schema, create a draft agent.
    Returns draft_id and the number of tables found.
    """
    try:
        introspector = SchemaIntrospector(body.db_type, body.db_uri)
        knowledge = introspector.introspect()
    except ConnectionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    config = AgentConfig(
        name="",
        db_type=body.db_type,
        db_uri=body.db_uri,
        schema_knowledge=knowledge,
    )

    store = _store()
    store.save_draft(config)

    return ConnectResponse(
        draft_id=config.agent_id,
        db_type=body.db_type,
        tables_found=len(knowledge.tables),
        message=f"Connected. Found {len(knowledge.tables)} table(s).",
    )


# ---------------------------------------------------------------------------
# Step 2 — inspect schema at any point
# ---------------------------------------------------------------------------

@router.get("/{draft_id}/schema", response_model=SchemaResponse)
async def get_schema(draft_id: str):
    """Return the current schema (with any enrichment applied so far)."""
    try:
        config = _store().load_draft(draft_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Draft {draft_id!r} not found")

    return SchemaResponse(
        draft_id=draft_id,
        tables=config.schema_knowledge.tables,
        relationships=config.schema_knowledge.relationships,
    )


# ---------------------------------------------------------------------------
# Step 3 — set relationships
# ---------------------------------------------------------------------------

@router.put("/{draft_id}/relationships", response_model=SuccessResponse)
async def set_relationships(draft_id: str, body: RelationshipBatch):
    """Replace all relationships on the draft with the provided batch."""
    store = _store()
    try:
        config = store.load_draft(draft_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Draft {draft_id!r} not found")

    updated = SchemaStore.apply_relationships(config, body)
    store.save_draft(updated)
    return SuccessResponse(success=True, message=f"Saved {len(body.relationships)} relationship(s).")


# ---------------------------------------------------------------------------
# Step 4 — enrich table/column labels + descriptions
# ---------------------------------------------------------------------------

@router.put("/{draft_id}/enrich", response_model=SuccessResponse)
async def enrich_schema(draft_id: str, body: EnrichSchemaRequest):
    """Apply table/column labels and descriptions to the draft."""
    store = _store()
    try:
        config = store.load_draft(draft_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Draft {draft_id!r} not found")

    updated = SchemaStore.apply_enrichment(config, body)
    store.save_draft(updated)
    return SuccessResponse(
        success=True,
        message=f"Enriched {len(body.tables)} table(s) and {len(body.columns)} column(s).",
    )


# ---------------------------------------------------------------------------
# Step 5 — finalize → publish agent
# ---------------------------------------------------------------------------

@router.post("/{draft_id}/finalize", response_model=AgentSummary)
async def finalize_agent(
    draft_id: str,
    body: FinalizeAgentRequest,
    current_user: User = Depends(require_auth),
):
    """
    Publish the draft as an active agent.
    Deletes the draft file and writes to agents/ directory.
    """
    store = _store()
    try:
        config = store.load_draft(draft_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Draft {draft_id!r} not found")

    try:
        active = SchemaStore.finalize(
            config=config,
            name=body.name,
            description=body.description,
            global_prompt=body.global_prompt,
            scope_mode=body.scope_mode,
            user_id_column=body.user_id_column,
            owner_id=current_user.user_id,
            access_mode=body.access_mode,
            allowed_users=body.allowed_users,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    store.save_agent(active)
    store.delete_draft(draft_id)

    return _to_summary(active)


# ---------------------------------------------------------------------------
# Discard a draft
# ---------------------------------------------------------------------------

@router.delete("/{draft_id}", response_model=SuccessResponse)
async def delete_draft(draft_id: str):
    """Discard a draft that will not be published."""
    store = _store()
    try:
        store.load_draft(draft_id)  # ensure it exists
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Draft {draft_id!r} not found")

    store.delete_draft(draft_id)
    return SuccessResponse(success=True, message="Draft deleted.")


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _to_summary(config: AgentConfig) -> AgentSummary:
    return AgentSummary(
        agent_id=config.agent_id,
        name=config.name,
        description=config.description,
        db_type=config.db_type,
        scope_mode=config.scope_mode,
        access_mode=config.access_mode,
        owner_id=config.owner_id,
        table_count=len(config.schema_knowledge.tables),
        status=config.status.value,
        created_at=config.created_at.isoformat(),
    )
