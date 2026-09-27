from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Read from environment variables prefixed AGRINEXUS_, or from backend/.env."""

    model_config = SettingsConfigDict(env_prefix='AGRINEXUS_', env_file=BACKEND_DIR / '.env')

    # The PostgreSQL container from docker-compose.yml (`docker compose up -d db`)
    database_url: str = 'postgresql+psycopg://agrinexus:agrinexus@localhost:5433/agrinexus'

    # Signs login tokens. The default is only fit for local development: set a long random
    # AGRINEXUS_SECRET_KEY anywhere real people log in.
    secret_key: str = 'dev-only-change-me'
    token_hours: int = 12
    remember_me_days: int = 30

    # The Vite dev server. Not needed when the frontend goes through its /api proxy.
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']

    # Weather for a ~10 km square barely changes within half an hour
    weather_cache_minutes: int = 30


settings = Settings()
