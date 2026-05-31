from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_optional_user, require_auth
from app.models.api import (
    AgentDetail,
    AgentSummary,
    ChatRequest,
    ChatResponse,
    SchemaResponse,
    SuccessResponse,
    UpdateAgentRequest,
)
from app.models.schema import AccessMode, AgentConfig, ScopeMode, User
from app.storage.agent_store import AgentStore

router = APIRouter(tags=["agents"])


def _store() -> AgentStore:
    return AgentStore()


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


def _check_access(config: AgentConfig, user: User | None) -> None:
    """Raise 401/403 if the user cannot access this agent."""
    mode = config.access_mode
    # Legacy agents (no owner) or public/link_only: open to all
    if config.owner_id is None or mode in (AccessMode.PUBLIC, AccessMode.LINK_ONLY):
        return
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    # Owner always has access
    if config.owner_id == user.user_id:
        return
    if mode == AccessMode.PRIVATE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if mode == AccessMode.RESTRICTED:
        if user.email.lower() not in [e.lower() for e in config.allowed_users]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _require_owner(config: AgentConfig, user: User) -> None:
    """Raise 403 if the user is not the owner."""
    if config.owner_id is not None and config.owner_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can do this")


# ---------------------------------------------------------------------------
# Agent management
# ---------------------------------------------------------------------------

@router.get("/agents", response_model=list[AgentSummary])
async def list_agents(current_user: User = Depends(require_auth)):
    """Return agents the current user can access."""
    result = []
    for c in _store().list_agents():
        is_owner = c.owner_id == current_user.user_id
        is_public = c.access_mode in (AccessMode.PUBLIC, AccessMode.LINK_ONLY)
        is_allowed = (
            c.access_mode == AccessMode.RESTRICTED
            and current_user.email.lower() in [e.lower() for e in c.allowed_users]
        )
        # Legacy agents (no owner) are visible to all
        if c.owner_id is None or is_owner or is_public or is_allowed:
            result.append(_to_summary(c))
    return result


@router.get("/agents/{agent_id}", response_model=AgentSummary)
async def get_agent(agent_id: str, current_user: User | None = Depends(get_optional_user)):
    try:
        config = _store().load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    _check_access(config, current_user)
    return _to_summary(config)


@router.get("/agents/{agent_id}/schema", response_model=SchemaResponse)
async def get_agent_schema(agent_id: str, current_user: User | None = Depends(get_optional_user)):
    try:
        config = _store().load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    _check_access(config, current_user)
    sk = config.schema_knowledge
    return SchemaResponse(draft_id=agent_id, tables=sk.tables, relationships=sk.relationships)


@router.get("/agents/{agent_id}/detail", response_model=AgentDetail)
async def get_agent_detail(agent_id: str, current_user: User = Depends(require_auth)):
    try:
        config = _store().load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    _require_owner(config, current_user)
    return AgentDetail(
        name=config.name,
        description=config.description,
        global_prompt=config.global_prompt,
        scope_mode=config.scope_mode,
        user_id_column=config.user_id_column,
        access_mode=config.access_mode,
        allowed_users=config.allowed_users,
    )


@router.patch("/agents/{agent_id}", response_model=AgentSummary)
async def update_agent(agent_id: str, body: UpdateAgentRequest, current_user: User = Depends(require_auth)):
    store = _store()
    try:
        config = store.load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    _require_owner(config, current_user)
    if body.scope_mode == ScopeMode.USER_SCOPED and not body.user_id_column:
        raise HTTPException(status_code=400, detail="user_id_column is required for user_scoped mode")
    updated = config.model_copy(update={
        "name": body.name,
        "description": body.description,
        "global_prompt": body.global_prompt,
        "scope_mode": body.scope_mode,
        "user_id_column": body.user_id_column,
        "access_mode": body.access_mode,
        "allowed_users": body.allowed_users,
    })
    store.save_agent(updated)
    return _to_summary(updated)


@router.delete("/agents/{agent_id}", response_model=SuccessResponse)
async def delete_agent(agent_id: str, current_user: User = Depends(require_auth)):
    store = _store()
    try:
        config = store.load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    _require_owner(config, current_user)
    store.delete_agent(agent_id)
    return SuccessResponse(success=True, message=f"Agent {agent_id!r} deleted.")


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.post("/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat(agent_id: str, body: ChatRequest, current_user: User | None = Depends(get_optional_user)):
    try:
        config = _store().load_agent(agent_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")

    _check_access(config, current_user)

    if config.scope_mode == ScopeMode.USER_SCOPED and not body.user_id:
        raise HTTPException(status_code=400, detail="This agent requires a user_id (scope_mode is user_scoped)")

    from app.agent.query_engine import QueryEngine
    try:
        engine = QueryEngine(config)
        answer, query, results = engine.run(body.message, user_id=body.user_id)
        return ChatResponse(answer=answer, generated_query=query, results=results)
    except (ValueError, RuntimeError) as e:
        return ChatResponse(answer="", generated_query=None, results=None, error=str(e))
    except Exception as e:
        return ChatResponse(answer="", generated_query=None, results=None, error=f"Query failed: {e}")
