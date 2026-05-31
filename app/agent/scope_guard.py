import json

from app.models.schema import AgentConfig, DbType, ScopeMode

_WRITE_KEYWORDS = frozenset({
    "insert", "update", "delete", "drop", "truncate",
    "create", "alter", "replace", "upsert", "merge",
})


class ScopeGuard:
    """
    Post-processes a generated query to enforce scope rules.

    Returns (scoped_query, params_dict).

    For SQL:   wraps the query as a subquery and injects a parameterized WHERE.
    For MongoDB: prepends a $match stage to the pipeline.

    This runs AFTER the LLM generates the query — it is a safety layer
    the user cannot bypass through prompt phrasing.
    """

    def __init__(self, config: AgentConfig) -> None:
        self._config = config

    def apply(self, query: str, user_id: str | None) -> tuple[str, dict]:
        """
        Apply scope filtering to the query.

        - FULL_DB     → (query, {}) unchanged
        - USER_SCOPED → wraps with user_id filter; raises if user_id is None

        Also raises ValueError on any detected write operation.
        """
        self._is_write_query(query)

        if self._config.scope_mode == ScopeMode.FULL_DB:
            return query, {}

        if not user_id:
            raise ValueError(
                "user_id is required for user-scoped agents"
            )

        if self._config.db_type == DbType.MONGODB:
            return self._apply_mongo_scope(query, user_id), {}
        else:
            return self._apply_sql_scope(query, user_id)

    # ------------------------------------------------------------------

    def _apply_sql_scope(self, query: str, user_id: str) -> tuple[str, dict]:
        """
        Wrap the SQL in a subquery and inject a parameterized WHERE.
        user_id_column may be "user_id" or "table.user_id" — only the column part is used.
        """
        user_id_col = self._config.user_id_column or "user_id"
        col_name = user_id_col.split(".")[-1]  # strip any table prefix

        scoped = (
            f"SELECT * FROM ({query}) AS _scoped "
            f"WHERE _scoped.{col_name} = :__scope_user_id"
        )
        return scoped, {"__scope_user_id": user_id}

    def _apply_mongo_scope(self, pipeline_json: str, user_id: str) -> str:
        """Prepend {"$match": {field: user_id}} to the MongoDB aggregation pipeline."""
        try:
            query_obj = json.loads(pipeline_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid MongoDB query JSON: {e}") from e

        user_id_field = self._config.user_id_column or "user_id"
        field_name = user_id_field.split(".")[-1]

        scope_stage = {"$match": {field_name: user_id}}
        pipeline = query_obj.get("pipeline", [])
        query_obj["pipeline"] = [scope_stage] + pipeline
        return json.dumps(query_obj)

    def _is_write_query(self, query: str) -> None:
        """Raise ValueError if query starts with a write keyword."""
        first = query.strip().split()[0].lower() if query.strip() else ""
        if first in _WRITE_KEYWORDS:
            raise ValueError(
                f"read-only agent: write query not allowed ({first.upper()})"
            )
