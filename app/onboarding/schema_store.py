from datetime import datetime, timezone

from app.models.schema import AccessMode, AgentConfig, AgentStatus, SchemaKnowledge, ScopeMode
from app.models.api import EnrichSchemaRequest, RelationshipBatch


class SchemaStore:
    """
    Pure functions for mutating schema enrichment on a draft AgentConfig.
    Always returns a NEW AgentConfig — never mutates in place.
    """

    @staticmethod
    def apply_relationships(
        config: AgentConfig,
        batch: RelationshipBatch,
    ) -> AgentConfig:
        """Replace all relationships with the provided batch."""
        updated_schema = config.schema_knowledge.model_copy(
            update={"relationships": batch.relationships}
        )
        return config.model_copy(update={
            "schema_knowledge": updated_schema,
            "updated_at": datetime.now(timezone.utc),
        })

    @staticmethod
    def apply_enrichment(
        config: AgentConfig,
        request: EnrichSchemaRequest,
    ) -> AgentConfig:
        """
        Merge table/column labels and descriptions into the draft.
        Only supplied (non-None) fields overwrite existing values.
        """
        table_map = {e.table_name: e for e in request.tables}
        col_map = {(e.table_name, e.column_name): e for e in request.columns}

        updated_tables = []
        for table in config.schema_knowledge.tables:
            te = table_map.get(table.name)

            updated_cols = []
            for col in table.columns:
                ce = col_map.get((table.name, col.name))
                if ce:
                    updates = {}
                    if ce.label is not None:
                        updates["label"] = ce.label
                    if ce.description is not None:
                        updates["description"] = ce.description
                    col = col.model_copy(update=updates) if updates else col
                updated_cols.append(col)

            table_updates: dict = {"columns": updated_cols}
            if te:
                if te.label is not None:
                    table_updates["label"] = te.label
                if te.description is not None:
                    table_updates["description"] = te.description

            updated_tables.append(table.model_copy(update=table_updates))

        updated_schema = config.schema_knowledge.model_copy(update={
            "tables": updated_tables,
            "enriched_at": datetime.now(timezone.utc),
        })
        return config.model_copy(update={
            "schema_knowledge": updated_schema,
            "updated_at": datetime.now(timezone.utc),
        })

    @staticmethod
    def finalize(
        config: AgentConfig,
        name: str,
        description: str,
        global_prompt: str,
        scope_mode: ScopeMode,
        user_id_column: str | None,
        owner_id: str | None = None,
        access_mode: AccessMode = AccessMode.PRIVATE,
        allowed_users: list[str] | None = None,
    ) -> AgentConfig:
        """
        Apply final settings and flip status to ACTIVE.
        Raises ValueError if scope_mode=USER_SCOPED but user_id_column is None.
        """
        if scope_mode == ScopeMode.USER_SCOPED and not user_id_column:
            raise ValueError(
                "user_id_column is required when scope_mode is user_scoped"
            )
        return config.model_copy(update={
            "name": name,
            "description": description,
            "global_prompt": global_prompt,
            "scope_mode": scope_mode,
            "user_id_column": user_id_column,
            "owner_id": owner_id,
            "access_mode": access_mode,
            "allowed_users": allowed_users or [],
            "status": AgentStatus.ACTIVE,
            "updated_at": datetime.now(timezone.utc),
        })
