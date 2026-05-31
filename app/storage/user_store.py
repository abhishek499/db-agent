from pathlib import Path

from app.config import settings
from app.models.schema import User


class UserStore:
    @property
    def _root(self) -> Path:
        return Path(settings.users_dir)

    def save_user(self, user: User) -> None:
        self._root.mkdir(parents=True, exist_ok=True)
        (self._root / f"{user.user_id}.json").write_text(user.model_dump_json())

    def load_user(self, user_id: str) -> User:
        path = self._root / f"{user_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"User {user_id!r} not found")
        return User.model_validate_json(path.read_text())

    def find_by_email(self, email: str) -> User | None:
        if not self._root.exists():
            return None
        for p in self._root.glob("*.json"):
            try:
                user = User.model_validate_json(p.read_text())
                if user.email.lower() == email.lower():
                    return user
            except Exception:
                pass
        return None

    def email_exists(self, email: str) -> bool:
        return self.find_by_email(email) is not None
