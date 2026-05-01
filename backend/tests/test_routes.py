from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.deps import get_board_service, get_current_username
from app.main import app
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
