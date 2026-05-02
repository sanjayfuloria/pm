from datetime import datetime, timezone

from app.repository import BoardRecord
from app.models import AIBoardAction
from app.service import AIService, BoardService


class FakeRepo:
    def __init__(self) -> None:
        self.record = BoardRecord(
            id="board-1",
            username="user",
            title="Kanban Studio",
            state={"columns": [], "cards": {}},
            state_version=1,
            updated_at=datetime.now(timezone.utc),
        )
        self.last_update_payload: dict | None = None

    def get_board(self, username: str) -> BoardRecord:
        assert username == "user"
        return self.record

    def update_board(self, username: str, state: dict, snapshot_on_update: bool = True) -> BoardRecord:
        assert username == "user"
        assert snapshot_on_update is True
        self.last_update_payload = state
        self.record = BoardRecord(
            id=self.record.id,
            username=self.record.username,
            title=self.record.title,
            state=state,
            state_version=self.record.state_version + 1,
            updated_at=datetime.now(timezone.utc),
        )
        return self.record


def test_get_board_returns_record() -> None:
    service = BoardService(FakeRepo())
    board = service.get_board("user")

    assert board.id == "board-1"
    assert board.state_version == 1


def test_update_board_increments_version() -> None:
    repo = FakeRepo()
    service = BoardService(repo)
    next_state = {"columns": [{"id": "col-backlog"}], "cards": {}}

    board = service.update_board("user", next_state)

    assert repo.last_update_payload == next_state
    assert board.state == next_state
    assert board.state_version == 2


class FakeAIClient:
    last_prompt: str | None = None

    def connectivity_check(self, prompt: str) -> str:
        self.last_prompt = prompt
        return "4"

    def structured_board_response(self, prompt: str, board_context: str) -> dict:
        self.last_prompt = f"{prompt}\n{board_context}"
        return {
            "message": "Done",
            "actions": [
                {
                    "type": "move_card",
                    "card_title": "Refine status language",
                    "from_column_title": "In Progress",
                    "to_column_title": "Review",
                    "details": None,
                }
            ],
        }


def test_ai_service_returns_model_and_output() -> None:
    service = AIService(client=FakeAIClient(), model="claude-sonnet-4-5-20250929")

    response = service.connectivity_check("What is 2+2?")

    assert response.model == "claude-sonnet-4-5-20250929"
    assert response.output_text == "4"


def test_ai_service_includes_board_context() -> None:
    client = FakeAIClient()
    service = AIService(client=client, model="claude-sonnet-4-5-20250929")

    response = service.connectivity_check(
        "What should I do next?",
        board_context='{"columns":[{"title":"Backlog"}]}',
    )

    assert response.output_text == "4"
    assert client.last_prompt is not None
    assert "Board context" in client.last_prompt
    assert "Backlog" in client.last_prompt
    assert "User request" in client.last_prompt


def test_ai_service_plan_board_actions() -> None:
    client = FakeAIClient()
    service = AIService(client=client, model="claude-sonnet-4-5-20250929")

    output_text, actions = service.plan_board_actions(
        prompt="Move card",
        board_context='{"columns":[]}',
    )

    assert output_text == "Done"
    assert len(actions) == 1
    assert isinstance(actions[0], AIBoardAction)
    assert actions[0].type == "move_card"
