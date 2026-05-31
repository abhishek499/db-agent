from pathlib import Path

from app.config import settings
from app.models.schema import User


class UserStore:
    """
    Persistence for user accounts.

    When DATABASE_URL is set the data is stored in PostgreSQL.
    Otherwise users are stored as JSON files under USERS_DIR.
    """

    def __init__(self) -> None:
        self._pg = bool(settings.database_url)

    @property
    def _root(self) -> Path:
        return Path(settings.users_dir)

    def save_user(self, user: User) -> None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (user_id, email, data) VALUES (%s, %s, %s) "
                        "ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, data = EXCLUDED.data",
                        (user.user_id, user.email.lower(), user.model_dump_json()),
                    )
        else:
            self._root.mkdir(parents=True, exist_ok=True)
            (self._root / f"{user.user_id}.json").write_text(user.model_dump_json())

    def load_user(self, user_id: str) -> User:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM users WHERE user_id = %s", (user_id,))
                    row = cur.fetchone()
            if not row:
                raise FileNotFoundError(f"User {user_id!r} not found")
            return User.model_validate_json(row[0])
        else:
            path = self._root / f"{user_id}.json"
            if not path.exists():
                raise FileNotFoundError(f"User {user_id!r} not found")
            return User.model_validate_json(path.read_text())

    def find_by_email(self, email: str) -> User | None:
        if self._pg:
            from app.storage.pg import get_conn
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT data FROM users WHERE email = %s",
                        (email.lower(),),
                    )
                    row = cur.fetchone()
            return User.model_validate_json(row[0]) if row else None
        else:
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
