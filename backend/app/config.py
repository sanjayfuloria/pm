from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    supabase_db_url: str | None



def load_settings() -> Settings:
    return Settings(supabase_db_url=os.getenv("SUPABASE_DB_URL"))
