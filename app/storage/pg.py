"""
PostgreSQL connection helper and schema initialisation.

Used only when DATABASE_URL is set in the environment.
The schema stores agent and user data as serialised JSON blobs so the rest
of the application can keep using the same Pydantic-based serialisation.
"""

from contextlib import contextmanager

import psycopg2

from app.config import settings


@contextmanager
def get_conn():
    conn = psycopg2.connect(settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if they don't exist. Called once at application startup."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agents (
                    agent_id TEXT PRIMARY KEY,
                    is_draft  BOOLEAN NOT NULL DEFAULT FALSE,
                    data      TEXT    NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    email   TEXT UNIQUE NOT NULL,
                    data    TEXT NOT NULL
                )
            """)
