from fastapi import Header, Request

from app.errors import NotConfiguredError
from app.service import BoardService


def get_current_username(x_username: str | None = Header(default=None)) -> str:
    # MVP auth is hardcoded, so we default to the known user when header is absent.
    return x_username or "user"


def get_board_service(request: Request) -> BoardService:
    service = getattr(request.app.state, "board_service", None)
    if service is None:
        raise NotConfiguredError(
            "SUPABASE_DB_URL is not configured. Board API is unavailable."
        )
    return service
