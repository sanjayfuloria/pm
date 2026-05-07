from pathlib import Path
import json
import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

logger = logging.getLogger(__name__)

from app.ai import AnthropicConnectivityClient
from app.config import Settings, load_settings
from app.deps import get_ai_service, get_board_service, get_current_username
from app.errors import AIProviderError, NotConfiguredError, NotFoundError, PersistenceError
from app.models import AIChatRequest, AIChatResponse, AIConnectivityRequest, AIConnectivityResponse, BoardResponse, BoardUpdateRequest
from app.repository import BoardRepository
from app.service import AIService, BoardService

app = FastAPI(title="Project Management MVP Backend")
api_router = APIRouter(prefix="/api")


def _parse_cors_allow_origins(raw_value: str) -> list[str]:
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


_settings = load_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_allow_origins(_settings.cors_allow_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Module-level initialization. Works in both uvicorn (local Docker) and Vercel
# serverless (where FastAPI lifespan events do not fire).
initialize_board_service(app, _settings)
initialize_ai_service(app, _settings)


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


@api_router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@api_router.get("/hello")
def hello_api() -> JSONResponse:
    return JSONResponse(
        {
            "message": "Hello from FastAPI",
            "service": "pm-backend",
        }
    )


@api_router.get("/board", response_model=BoardResponse)
def get_board(
    username: str = Depends(get_current_username),
    service: BoardService = Depends(get_board_service),
) -> BoardResponse:
    return service.get_board(username=username)


@api_router.put("/board", response_model=BoardResponse)
def put_board(
    payload: BoardUpdateRequest,
    username: str = Depends(get_current_username),
    service: BoardService = Depends(get_board_service),
) -> BoardResponse:
    return service.update_board(username=username, state=payload.state)


@api_router.post("/ai/connectivity", response_model=AIConnectivityResponse)
def ai_connectivity(
    payload: AIConnectivityRequest,
    request: Request,
    username: str = Depends(get_current_username),
    service: AIService = Depends(get_ai_service),
) -> AIConnectivityResponse:
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
    username: str = Depends(get_current_username),
    board_service: BoardService = Depends(get_board_service),
    ai_service: AIService = Depends(get_ai_service),
) -> AIChatResponse:
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
