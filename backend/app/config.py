from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    supabase_db_url: str | None
    anthropic_api_key: str | None
    anthropic_model: str
    cors_allow_origins: str



def load_settings() -> Settings:
    return Settings(
        supabase_db_url=os.getenv("SUPABASE_DB_URL"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"),
        cors_allow_origins=os.getenv("CORS_ALLOW_ORIGINS", ""),
    )
