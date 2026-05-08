from pathlib import Path
import json
import logging
import os

from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

logger = logging.getLogger(__name__)

from app.ai import AnthropicConnectivityClient
from app.auth import create_session, delete_session, hash_password, verify_password
from app.auth_repository import AuthRepository
from app.config import Settings, load_settings
from app.deps import get_ai_service, get_board_service, get_current_user, require_teacher
from app.errors import AIProviderError, NotConfiguredError, NotFoundError, PersistenceError
from app.models import (
    AIChatRequest, AIChatResponse, AIConnectivityRequest, AIConnectivityResponse,
    BoardResponse, BoardUpdateRequest, ChangePasswordRequest,
    CreateStudentRequest, LoginRequest, LoginResponse, StudentResponse,
)
from app.repository import BoardRepository
from app.service import AIService, BoardService


def initialize_board_service(fastapi_app: FastAPI, settings: Settings) -> None:
    if not settings.supabase_db_url:
        fastapi_app.state.board_service = None
        return

    repository = BoardRepository(settings.supabase_db_url)
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    repository.apply_migrations(migrations_dir=migrations_dir)
    fastapi_app.state.board_service = BoardService(repository)


def initialize_ai_service(fastapi_app: FastAPI, settings: Settings) -> None:
    if not settings.anthropic_api_key:
        fastapi_app.state.ai_service = None
        return

    client = AnthropicConnectivityClient(
        api_key=settings.anthropic_api_key,
        model=settings.anthropic_model,
    )
    fastapi_app.state.ai_service = AIService(client=client, model=settings.anthropic_model)


def seed_default_teacher(db_url: str) -> None:
    repo = AuthRepository(db_url)
    existing = repo.get_user_by_username("teacher")
    if existing and existing["password_hash"]:
        return
    hashed = hash_password("changeme")
    if existing:
        repo.update_password(existing["id"], hashed)
    else:
        repo.create_user(username="teacher", password_hash=hashed, role="teacher")


def _parse_cors_allow_origins(raw_value: str) -> list[str]:
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


app = FastAPI(title="Project Management MVP Backend")
api_router = APIRouter(prefix="/api")

_settings = load_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_allow_origins(_settings.cors_allow_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store db_url on app.state so deps.py can access it for session validation.
app.state.db_url = _settings.supabase_db_url

# Module-level initialization.
_board_init_error: str | None = None
_ai_init_error: str | None = None

try:
    initialize_board_service(app, _settings)
except Exception as exc:
    logger.exception("Board service initialization failed")
    _board_init_error = str(exc)
    app.state.board_service = None

try:
    initialize_ai_service(app, _settings)
except Exception as exc:
    logger.exception("AI service initialization failed")
    _ai_init_error = str(exc)
    app.state.ai_service = None

try:
    if _settings.supabase_db_url:
        seed_default_teacher(_settings.supabase_db_url)
except Exception:
    logger.exception("Failed to seed default teacher account")


@app.exception_handler(NotFoundError)
async def handle_not_found(_request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})


@app.exception_handler(NotConfiguredError)
async def handle_not_configured(_request, exc: NotConfiguredError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": str(exc)},
    )


@app.exception_handler(PersistenceError)
async def handle_persistence(_request, exc: PersistenceError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


@app.exception_handler(AIProviderError)
async def handle_ai_provider_error(_request, exc: AIProviderError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": str(exc)},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation(_request, exc: RequestValidationError) -> JSONResponse:
    detail = [{k: v for k, v in item.items() if k != "input"} for item in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": detail},
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@api_router.get("/health")
def healthcheck() -> dict[str, str]:
    result = {
        "status": "ok",
        "board_service": "configured" if getattr(app.state, "board_service", None) else "not configured",
        "ai_service": "configured" if getattr(app.state, "ai_service", None) else "not configured",
    }
    if _board_init_error:
        result["board_init_error"] = _board_init_error
    if _ai_init_error:
        result["ai_init_error"] = _ai_init_error
    return result


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@api_router.post("/auth/login", response_model=LoginResponse)
def auth_login(payload: LoginRequest, request: Request) -> LoginResponse:
    db_url = getattr(request.app.state, "db_url", None)
    if not db_url:
        raise NotConfiguredError("Database not configured")
    repo = AuthRepository(db_url)
    user = repo.get_user_by_username(payload.username.strip().lower())
    if not user or not verify_password(payload.password, user["password_hash"]):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid username or password"},
        )
    token = create_session(db_url, str(user["id"]))
    return LoginResponse(token=token, username=user["username"], role=user["role"])


@api_router.post("/auth/logout")
def auth_logout(
    request: Request,
    user: dict = Depends(get_current_user),
) -> JSONResponse:
    db_url = request.app.state.db_url
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    delete_session(db_url, token)
    return JSONResponse(content={"detail": "Logged out"})


@api_router.post("/auth/change-password")
def auth_change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: dict = Depends(get_current_user),
) -> JSONResponse:
    db_url = request.app.state.db_url
    repo = AuthRepository(db_url)
    db_user = repo.get_user_by_username(user["username"])
    if not db_user or not verify_password(payload.current_password, db_user["password_hash"]):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "Current password is incorrect"},
        )
    repo.update_password(str(db_user["id"]), hash_password(payload.new_password))
    return JSONResponse(content={"detail": "Password changed"})


# ---------------------------------------------------------------------------
# Admin (teacher-only)
# ---------------------------------------------------------------------------

@api_router.get("/admin/students", response_model=list[StudentResponse])
def list_students(
    request: Request,
    user: dict = Depends(require_teacher),
) -> list[StudentResponse]:
    db_url = request.app.state.db_url
    repo = AuthRepository(db_url)
    rows = repo.list_students()
    return [StudentResponse(id=str(r["id"]), username=r["username"], created_at=r["created_at"]) for r in rows]


@api_router.post("/admin/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: CreateStudentRequest,
    request: Request,
    user: dict = Depends(require_teacher),
) -> StudentResponse:
    db_url = request.app.state.db_url
    repo = AuthRepository(db_url)
    hashed = hash_password(payload.password)
    row = repo.create_user(
        username=payload.username.strip().lower(),
        password_hash=hashed,
        role="student",
    )
    return StudentResponse(id=str(row["id"]), username=row["username"], created_at=row["created_at"])


@api_router.delete("/admin/students/{username}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    username: str,
    request: Request,
    user: dict = Depends(require_teacher),
) -> None:
    db_url = request.app.state.db_url
    repo = AuthRepository(db_url)
    repo.delete_user(username)


# ---------------------------------------------------------------------------
# Board
# ---------------------------------------------------------------------------

@api_router.get("/board", response_model=BoardResponse)
def get_board(
    user: dict = Depends(get_current_user),
    service: BoardService = Depends(get_board_service),
    student: str | None = Query(default=None),
) -> BoardResponse:
    if student:
        if user["role"] != "teacher":
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Only teachers can view student boards"},
            )
        return service.get_board(username=student)
    return service.get_board(username=user["username"])


@api_router.put("/board", response_model=BoardResponse)
def put_board(
    payload: BoardUpdateRequest,
    user: dict = Depends(get_current_user),
    service: BoardService = Depends(get_board_service),
) -> BoardResponse:
    return service.update_board(username=user["username"], state=payload.state)


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------

@api_router.post("/ai/connectivity", response_model=AIConnectivityResponse)
def ai_connectivity(
    payload: AIConnectivityRequest,
    request: Request,
    user: dict = Depends(get_current_user),
    service: AIService = Depends(get_ai_service),
) -> AIConnectivityResponse:
    username = user["username"]
    board_context = None
    board_service = getattr(request.app.state, "board_service", None)
    if board_service is not None:
        try:
            board = board_service.get_board(username=username)
            cards_by_id = board.state.get("cards", {})
            columns = []
            for column in board.state.get("columns", []):
                card_titles = []
                for card_id in column.get("cardIds", []):
                    card = cards_by_id.get(card_id)
                    if isinstance(card, dict):
                        card_titles.append(card.get("title", card_id))
                columns.append(
                    {
                        "id": column.get("id"),
                        "title": column.get("title"),
                        "cards": card_titles,
                    }
                )

            board_context = json.dumps(
                {
                    "board_title": board.title,
                    "state_version": board.state_version,
                    "columns": columns,
                },
                ensure_ascii=True,
            )
        except (NotFoundError, PersistenceError):
            board_context = None
        except Exception:
            logger.exception("Unexpected error loading board context for AI connectivity")
            board_context = None

    return service.connectivity_check(prompt=payload.prompt, board_context=board_context)


def _normalize_label(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("\"", "")
        .replace("'", "")
        .replace(" card", "")
        .replace(" column", "")
        .replace("  ", " ")
    )


@api_router.post("/ai/chat", response_model=AIChatResponse)
def ai_chat(
    payload: AIChatRequest,
    user: dict = Depends(get_current_user),
    board_service: BoardService = Depends(get_board_service),
    ai_service: AIService = Depends(get_ai_service),
) -> AIChatResponse:
    username = user["username"]
    board = board_service.get_board(username=username)
    cards_by_id = board.state.get("cards", {})
    columns = board.state.get("columns", [])

    board_context = json.dumps(
        {
            "board_title": board.title,
            "state_version": board.state_version,
            "columns": [
                {
                    "id": column.get("id"),
                    "title": column.get("title"),
                    "cards": [cards_by_id.get(card_id, {}).get("title", card_id) for card_id in column.get("cardIds", [])],
                }
                for column in columns
            ],
        },
        ensure_ascii=True,
    )

    output_text, actions = ai_service.plan_board_actions(prompt=payload.prompt, board_context=board_context)

    next_state = {
        "columns": [dict(column) for column in columns],
        "cards": dict(cards_by_id),
    }
    applied_actions: list[str] = []

    for action in actions:
        action_type = action.type
        card_title = action.card_title

        if action_type == "move_card":
            from_column = next(
                (column for column in next_state["columns"] if _normalize_label(column.get("title", "")) == _normalize_label(action.from_column_title or "")),
                None,
            )
            to_column = next(
                (column for column in next_state["columns"] if _normalize_label(column.get("title", "")) == _normalize_label(action.to_column_title or "")),
                None,
            )
            card = next(
                (card for card in next_state["cards"].values() if _normalize_label(card.get("title", "")) == _normalize_label(card_title)),
                None,
            )
            if not from_column or not to_column or not card:
                continue

            card_id = card["id"]
            if card_id in from_column.get("cardIds", []):
                from_column["cardIds"] = [item for item in from_column.get("cardIds", []) if item != card_id]
            if card_id not in to_column.get("cardIds", []):
                to_column["cardIds"].append(card_id)
            applied_actions.append(
                f"Moved '{card.get('title')}' from '{from_column.get('title')}' to '{to_column.get('title')}'"
            )

        elif action_type == "create_card":
            to_column = next(
                (column for column in next_state["columns"] if _normalize_label(column.get("title", "")) == _normalize_label(action.to_column_title or "")),
                None,
            )
            if not to_column:
                continue
            card_id = f"card-ai-{len(next_state['cards']) + 1}"
            next_state["cards"][card_id] = {
                "id": card_id,
                "title": card_title,
                "details": action.details or "Added by AI.",
            }
            to_column["cardIds"].append(card_id)
            applied_actions.append(f"Created '{card_title}' in '{to_column.get('title')}'")

        elif action_type == "edit_card":
            card = next(
                (card for card in next_state["cards"].values() if _normalize_label(card.get("title", "")) == _normalize_label(card_title)),
                None,
            )
            if not card:
                continue
            if action.details:
                card["details"] = action.details
                applied_actions.append(f"Edited '{card.get('title')}'")

    updated_board = board
    if applied_actions:
        updated_board = board_service.update_board(username=username, state=next_state)

    return AIChatResponse(
        model=ai_service.model_name,
        output_text=output_text,
        applied_actions=applied_actions,
        board_state_version=updated_board.state_version,
    )


app.include_router(api_router)


static_dir = Path(__file__).resolve().parent.parent / "static"


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    index_file = static_dir / "index.html"
    return FileResponse(index_file)


@app.get("/{path:path}", include_in_schema=False)
def static_files(path: str) -> FileResponse:
    candidate = static_dir / path
    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate)

    return FileResponse(static_dir / "index.html")
