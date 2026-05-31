import anthropic

from app.agent.formatter import summarize_results, to_query_result
from app.agent.scope_guard import ScopeGuard
from app.config import settings
from app.db.factory import get_adapter
from app.models.api import QueryResult
from app.models.schema import AgentConfig, DbType, ScopeMode


class QueryEngine:
    """
    Translates a natural language message into SQL or MongoDB query,
    executes it, and returns (plain-English answer, generated query, raw results).
    """

    def __init__(self, config: AgentConfig) -> None:
        self._config = config

    def run(
        self,
        message: str,
        user_id: str | None = None,
    ) -> tuple[str, str, QueryResult]:
        """
        Full pipeline: NL → generate query → scope → execute → summarize.

        Raises ValueError if scope_mode=USER_SCOPED and user_id is None.
        Raises RuntimeError if query generation or execution fails unexpectedly.
        """
        if self._config.scope_mode == ScopeMode.USER_SCOPED and not user_id:
            raise ValueError("user_id is required for user-scoped agents")

        # 1. Build system prompt enriched with schema knowledge
        system_prompt = self._build_system_prompt()

        # 2. Generate SQL / MQL via Claude Sonnet
        raw_query = self._generate_query(system_prompt, message)

        # If Claude returned conversational text instead of a query, return it directly
        if not self._looks_like_query(raw_query):
            empty = to_query_result([], [])
            return raw_query, "", empty

        # 3. Scope guard: inject user filter + block writes
        guard = ScopeGuard(self._config)
        scoped_query, scope_params = guard.apply(raw_query, user_id)

        # 4. Execute against the database
        with get_adapter(self._config.db_type, self._config.db_uri) as adapter:
            cols, rows = adapter.execute_query(scoped_query, scope_params)

        # 5. Serialize + summarize
        result = to_query_result(cols, rows)
        answer = summarize_results(
            message, scoped_query, result, self._config.global_prompt
        )

        return answer, scoped_query, result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system_prompt(self) -> str:
        schema = self._config.schema_knowledge
        lines: list[str] = []

        if self._config.global_prompt:
            lines += [self._config.global_prompt, ""]

        lines += [
            "You are a precise database query assistant.",
            f"Database type: {self._config.db_type.value}",
            "",
            "## Schema",
        ]

        for table in schema.tables:
            label = f" ({table.label})" if table.label else ""
            desc = f" — {table.description}" if table.description else ""
            lines.append(f"\nTable: {table.name}{label}{desc}")
            for col in table.columns:
                col_label = f" [{col.label}]" if col.label else ""
                col_desc = f" — {col.description}" if col.description else ""
                flags = "".join([
                    " PK" if col.is_primary_key else "",
                    " FK" if col.is_foreign_key else "",
                ])
                lines.append(
                    f"  - {col.name}{col_label}: {col.db_type}{flags}{col_desc}"
                )

        if schema.relationships:
            lines.append("\n## Relationships")
            for rel in schema.relationships:
                desc = f" — {rel.description}" if rel.description else ""
                lines.append(
                    f"  - {rel.from_table}.{rel.from_column} → "
                    f"{rel.to_table}.{rel.to_column}{desc}"
                )

        if self._config.scope_mode == ScopeMode.USER_SCOPED and self._config.user_id_column:
            lines += [
                "\n## User Scope",
                f"Always filter by {self._config.user_id_column} = the provided user ID.",
            ]

        if self._config.db_type == DbType.MONGODB:
            lines += [
                "\n## Output Rules",
                'Output ONLY a JSON object: {"collection": "<name>", "pipeline": [...]}',
                "No explanation. No markdown. No code fences.",
                "Never include $out, $merge, or any write stages.",
                f"Always include a $limit stage capped at {settings.max_query_rows}.",
            ]
        else:
            lines += [
                "\n## Output Rules",
                "Output ONLY a single SELECT SQL statement.",
                "No explanation. No markdown. No code fences.",
                "Never use INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER.",
                f"Always add LIMIT {settings.max_query_rows} at the end.",
            ]

        return "\n".join(lines)

    def _looks_like_query(self, text: str) -> bool:
        """Return True if the text appears to be a SQL SELECT or MongoDB JSON query."""
        t = text.strip().upper()
        if self._config.db_type == DbType.MONGODB:
            return text.strip().startswith("{")
        return t.startswith("SELECT") or t.startswith("WITH")

    def _generate_query(self, system_prompt: str, message: str) -> str:
        """Call Claude Sonnet to generate the raw SQL or MQL string."""
        if not settings.anthropic_api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is not configured. "
                "Add it to your .env file to enable chat."
            )
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": message}],
        )
        query = response.content[0].text.strip()

        # Strip accidental markdown code-fence wrapping
        if query.startswith("```"):
            inner = [
                ln for ln in query.splitlines()
                if not ln.startswith("```")
            ]
            query = "\n".join(inner).strip()

        return query
