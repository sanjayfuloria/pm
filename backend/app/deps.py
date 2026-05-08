from fastapi import Depends, Header, HTTPException, Request, status

from app.auth import validate_session
from app.errors import NotConfiguredError
from app.service import AIService, BoardService


def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    db_url = getattr(request.app.state, "db_url", None)
    if not db_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured")
    user = validate_session(db_url, token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
    return user


def require_teacher(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher access required")
    return user


def get_board_service(request: Request) -> BoardService:
    service = getattr(request.app.state, "board_service", None)
    if service is None:
        raise NotConfiguredError(
            "SUPABASE_DB_URL is not configured. Board API is unavailable."
        )
    return service


def get_ai_service(request: Request) -> AIService:
    service = getattr(request.app.state, "ai_service", None)
    if service is None:
        raise NotConfiguredError(
            "ANTHROPIC_API_KEY is not configured. AI API is unavailable."
        )
    return service
