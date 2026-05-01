from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi import status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter

from app.config import Settings, load_settings
from app.deps import get_board_service, get_current_username
from app.errors import NotConfiguredError, NotFoundError, PersistenceError
from app.models import BoardResponse, BoardUpdateRequest
from app.repository import BoardRepository
from app.service import BoardService

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    initialize_board_service(fastapi_app, load_settings())
    yield


app = FastAPI(title="Project Management MVP Backend", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


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


@app.exception_handler(RequestValidationError)
async def handle_validation(_request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": exc.errors()},
    )


def initialize_board_service(fastapi_app: FastAPI, settings: Settings) -> None:
    if not settings.supabase_db_url:
        fastapi_app.state.board_service = None
        return

    repository = BoardRepository(settings.supabase_db_url)
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    repository.apply_migrations(migrations_dir=migrations_dir)
    fastapi_app.state.board_service = BoardService(repository)


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
