from pathlib import Path

from app.models.schema import AgentConfig, AgentStatus
from app.config import settings


class AgentStore:
    """
    File-based persistence for agent configs.

    Layout:
        {AGENTS_DIR}/
            drafts/{draft_id}.json   — in-progress onboarding sessions
            {agent_id}.json          — published (ACTIVE) agents
    """

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
        self._drafts_dir.mkdir(parents=True, exist_ok=True)
        (self._drafts_dir / f"{config.agent_id}.json").write_text(
            config.model_dump_json()
        )

    def load_draft(self, draft_id: str) -> AgentConfig:
        path = self._drafts_dir / f"{draft_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Draft {draft_id!r} not found")
        return AgentConfig.model_validate_json(path.read_text())

    def delete_draft(self, draft_id: str) -> None:
        path = self._drafts_dir / f"{draft_id}.json"
        if path.exists():
            path.unlink()

    # ------------------------------------------------------------------
    # Active agents
    # ------------------------------------------------------------------

    def save_agent(self, config: AgentConfig) -> None:
        self._root.mkdir(parents=True, exist_ok=True)
        (self._root / f"{config.agent_id}.json").write_text(
            config.model_dump_json()
        )

    def load_agent(self, agent_id: str) -> AgentConfig:
        path = self._root / f"{agent_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Agent {agent_id!r} not found")
        return AgentConfig.model_validate_json(path.read_text())

    def list_agents(self) -> list[AgentConfig]:
        if not self._root.exists():
            return []
        agents = []
        for p in self._root.glob("*.json"):
            try:
                agents.append(AgentConfig.model_validate_json(p.read_text()))
            except Exception:
                pass  # skip corrupt files
        return agents

    def delete_agent(self, agent_id: str) -> None:
        path = self._root / f"{agent_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Agent {agent_id!r} not found")
        path.unlink()
