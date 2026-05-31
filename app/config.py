from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8")

    anthropic_api_key: str = ""
    agents_dir: str = "./agents"
    users_dir: str = "./users"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    max_query_rows: int = 500


settings = Settings()
