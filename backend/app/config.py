import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseModel):
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"
    openai_timeout_seconds: float = Field(default=25.0, gt=0, le=29)
    use_mock: bool = True
    frontend_origin: str = "http://localhost:5173"


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@lru_cache
def get_settings() -> Settings:
    load_dotenv(BACKEND_DIR / ".env", override=False)
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
        openai_timeout_seconds=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "25")),
        use_mock=_env_bool("USE_MOCK", True),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
    )

