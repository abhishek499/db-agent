from pathlib import Path

from app.config import settings
from app.models.schema import AgentConfig


class AgentStore:
    """
    Persistence for agent configs.

    When DATABASE_URL is set the data is stored in PostgreSQL (required for
    platforms with an ephemeral filesystem such as Heroku).  Otherwise the
    original file-based layout is used:

        {AGENTS_DIR}/
            drafts/{draft_id}.json   — in-progress onboarding sessions
            {agent_id}.json          — published (ACTIVE) agents
    """

    def __init__(self) -> None:
        self._pg = bool(settings.database_url)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _root(self) -> Path:
        return Path(settings.agents_dir)

    @property
    def _drafts_dir(self) -> Path:
        return self._root / "drafts"

    # ------------------------------------------------------------------
    # Drafts
    # ------------------------------------------------------------------

    def save_draft(self, config: AgentConfig) -> None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO agents (agent_id, is_draft, data) VALUES (%s, TRUE, %s) "
                        "ON CONFLICT (agent_id) DO UPDATE SET data = EXCLUDED.data",
                        (config.agent_id, config.model_dump_json()),
                    )
        else:
            self._drafts_dir.mkdir(parents=True, exist_ok=True)
            (self._drafts_dir / f"{config.agent_id}.json").write_text(config.model_dump_json())

    def load_draft(self, draft_id: str) -> AgentConfig:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT data FROM agents WHERE agent_id = %s AND is_draft = TRUE",
                        (draft_id,),
                    )
                    row = cur.fetchone()
            if not row:
                raise FileNotFoundError(f"Draft {draft_id!r} not found")
            return AgentConfig.model_validate_json(row[0])
        else:
            path = self._drafts_dir / f"{draft_id}.json"
            if not path.exists():
                raise FileNotFoundError(f"Draft {draft_id!r} not found")
            return AgentConfig.model_validate_json(path.read_text())

    def delete_draft(self, draft_id: str) -> None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM agents WHERE agent_id = %s AND is_draft = TRUE",
                        (draft_id,),
                    )
        else:
            path = self._drafts_dir / f"{draft_id}.json"
            if path.exists():
                path.unlink()

    # ------------------------------------------------------------------
    # Active agents
    # ------------------------------------------------------------------

    def save_agent(self, config: AgentConfig) -> None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO agents (agent_id, is_draft, data) VALUES (%s, FALSE, %s) "
                        "ON CONFLICT (agent_id) DO UPDATE SET is_draft = FALSE, data = EXCLUDED.data",
                        (config.agent_id, config.model_dump_json()),
                    )
        else:
            self._root.mkdir(parents=True, exist_ok=True)
            (self._root / f"{config.agent_id}.json").write_text(config.model_dump_json())

    def load_agent(self, agent_id: str) -> AgentConfig:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT data FROM agents WHERE agent_id = %s AND is_draft = FALSE",
                        (agent_id,),
                    )
                    row = cur.fetchone()
            if not row:
                raise FileNotFoundError(f"Agent {agent_id!r} not found")
            return AgentConfig.model_validate_json(row[0])
        else:
            path = self._root / f"{agent_id}.json"
            if not path.exists():
                raise FileNotFoundError(f"Agent {agent_id!r} not found")
            return AgentConfig.model_validate_json(path.read_text())

    def list_agents(self) -> list[AgentConfig]:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM agents WHERE is_draft = FALSE")
                    rows = cur.fetchall()
            result = []
            for (data,) in rows:
                try:
                    result.append(AgentConfig.model_validate_json(data))
                except Exception:
                    pass
            return result
        else:
            if not self._root.exists():
                return []
            agents = []
            for p in self._root.glob("*.json"):
                try:
                    agents.append(AgentConfig.model_validate_json(p.read_text()))
                except Exception:
                    pass
            return agents

    def delete_agent(self, agent_id: str) -> None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT 1 FROM agents WHERE agent_id = %s AND is_draft = FALSE",
                        (agent_id,),
                    )
                    if not cur.fetchone():
                        raise FileNotFoundError(f"Agent {agent_id!r} not found")
                    cur.execute(
                        "DELETE FROM agents WHERE agent_id = %s AND is_draft = FALSE",
                        (agent_id,),
                    )
        else:
            path = self._root / f"{agent_id}.json"
            if not path.exists():
                raise FileNotFoundError(f"Agent {agent_id!r} not found")
            path.unlink()
