from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.deps import get_ai_service, get_board_service, get_current_username
from app.errors import AIProviderError
from app.main import app
from app.models import AIBoardAction
from app.models import BoardResponse


class FakeBoardService:
    def __init__(self) -> None:
        self.board = BoardResponse(
            id="board-1",
            username="user",
            title="Kanban Studio",
            state={"columns": [], "cards": {}},
            state_version=1,
            updated_at=datetime.now(timezone.utc),
        )

    def get_board(self, username: str) -> BoardResponse:
        assert username == "user"
        return self.board

    def update_board(self, username: str, state: dict) -> BoardResponse:
        assert username == "user"
        self.board = BoardResponse(
            id=self.board.id,
            username=self.board.username,
            title=self.board.title,
            state=state,
            state_version=self.board.state_version + 1,
            updated_at=datetime.now(timezone.utc),
        )
        return self.board


class FakeAIService:
    model_name = "claude-sonnet-4-5-20250929"

    def connectivity_check(self, prompt: str, board_context: str | None = None):
        assert prompt == "What is 2+2?"
        assert board_context is None or "columns" in board_context
        return {
            "model": "claude-sonnet-4-5-20250929",
            "output_text": "4",
        }

    def plan_board_actions(self, prompt: str, board_context: str):
        assert prompt
        assert "columns" in board_context
        return (
            "Done.",
            [
                AIBoardAction(
                    type="move_card",
                    card_title="Refine status language",
                    from_column_title="In Progress",
                    to_column_title="Review",
                    details=None,
                )
            ],
        )


class FailingAIService:
    model_name = "claude-sonnet-4-5-20250929"

    def connectivity_check(self, prompt: str, board_context: str | None = None):
        assert prompt
        raise AIProviderError("Anthropic request failed.")

    def plan_board_actions(self, prompt: str, board_context: str):
        raise AIProviderError("Anthropic request failed.")


def test_get_board_route() -> None:
    fake_service = FakeBoardService()
    app.dependency_overrides[get_board_service] = lambda: fake_service
    app.dependency_overrides[get_current_username] = lambda: "user"

    client = TestClient(app)
    response = client.get("/api/board")

    assert response.status_code == 200
    payload = response.json()
    assert payload["username"] == "user"
    assert payload["state_version"] == 1

    app.dependency_overrides.clear()


def test_put_board_route() -> None:
    fake_service = FakeBoardService()
    app.dependency_overrides[get_board_service] = lambda: fake_service
    app.dependency_overrides[get_current_username] = lambda: "user"

    client = TestClient(app)
    response = client.put(
        "/api/board",
        json={"state": {"columns": [{"id": "col-done"}], "cards": {}}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["state"]["columns"][0]["id"] == "col-done"
    assert payload["state_version"] == 2

    app.dependency_overrides.clear()


def test_put_board_validates_payload() -> None:
    fake_service = FakeBoardService()
    app.dependency_overrides[get_board_service] = lambda: fake_service
    app.dependency_overrides[get_current_username] = lambda: "user"

    client = TestClient(app)
    response = client.put("/api/board", json={"invalid": "shape"})

    assert response.status_code == 422
    app.dependency_overrides.clear()


def test_ai_connectivity_route() -> None:
    app.dependency_overrides.clear()
    app.dependency_overrides[get_ai_service] = lambda: FakeAIService()

    client = TestClient(app)
    response = client.post(
        "/api/ai/connectivity",
        json={"prompt": "What is 2+2?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["output_text"] == "4"
    assert payload["model"] == "claude-sonnet-4-5-20250929"

    app.dependency_overrides.clear()


def test_ai_connectivity_missing_api_key() -> None:
    app.dependency_overrides.clear()
    client = TestClient(app)
    response = client.post("/api/ai/connectivity", json={"prompt": "ping"})

    assert response.status_code == 503
    assert response.json()["detail"] == "ANTHROPIC_API_KEY is not configured. AI API is unavailable."


def test_ai_connectivity_provider_failure() -> None:
    app.dependency_overrides.clear()
    app.dependency_overrides[get_ai_service] = lambda: FailingAIService()

    client = TestClient(app)
    response = client.post("/api/ai/connectivity", json={"prompt": "ping"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Anthropic request failed."

    app.dependency_overrides.clear()


def test_ai_chat_route() -> None:
    fake_board = FakeBoardService()
    fake_board.board = BoardResponse(
        id="board-1",
        username="user",
        title="Kanban Studio",
        state={
            "columns": [
                {"id": "col-progress", "title": "In Progress", "cardIds": ["card-1"]},
                {"id": "col-review", "title": "Review", "cardIds": []},
            ],
            "cards": {
                "card-1": {
                    "id": "card-1",
                    "title": "Refine status language",
                    "details": "Draft details",
                }
            },
        },
        state_version=1,
        updated_at=datetime.now(timezone.utc),
    )

    app.dependency_overrides.clear()
    app.dependency_overrides[get_ai_service] = lambda: FakeAIService()
    app.dependency_overrides[get_board_service] = lambda: fake_board
    app.dependency_overrides[get_current_username] = lambda: "user"

    client = TestClient(app)
    response = client.post(
        "/api/ai/chat",
        json={"prompt": "Move refine status language from in progress to review"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["output_text"] == "Done."
    assert len(payload["applied_actions"]) == 1
    assert payload["board_state_version"] == 2

    app.dependency_overrides.clear()
