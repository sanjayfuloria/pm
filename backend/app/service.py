from typing import Protocol

from app.models import BoardResponse
from app.models import AIBoardAction
from app.models import AIChatResponse
from app.models import AIConnectivityResponse
from app.repository import BoardRepository


class BoardService:
    def __init__(self, repository: BoardRepository) -> None:
        self._repository = repository

    def get_board(self, username: str) -> BoardResponse:
        record = self._repository.get_board(username)
        payload = {**record.__dict__, "id": str(record.id)}
        return BoardResponse(**payload)

    def update_board(self, username: str, state: dict) -> BoardResponse:
        record = self._repository.update_board(username=username, state=state)
        payload = {**record.__dict__, "id": str(record.id)}
        return BoardResponse(**payload)


class AIConnectivityClient(Protocol):
    def connectivity_check(self, prompt: str) -> str:
        ...

    def structured_board_response(self, prompt: str, board_context: str) -> dict:
        ...


class AIService:
    def __init__(self, client: AIConnectivityClient, model: str) -> None:
        self._client = client
        self._model = model

    def connectivity_check(self, prompt: str, board_context: str | None = None) -> AIConnectivityResponse:
        if board_context:
            composed_prompt = (
                "You are assisting with a project management board. "
                "Use the board context below when answering.\n\n"
                f"Board context:\n{board_context}\n\n"
                f"User request:\n{prompt}"
            )
        else:
            composed_prompt = prompt

        output_text = self._client.connectivity_check(composed_prompt)
        return AIConnectivityResponse(model=self._model, output_text=output_text)

    @property
    def model_name(self) -> str:
        return self._model

    def plan_board_actions(self, prompt: str, board_context: str) -> tuple[str, list[AIBoardAction]]:
        payload = self._client.structured_board_response(prompt=prompt, board_context=board_context)
        output_text = payload.get("message", "")
        raw_actions = payload.get("actions", [])
        actions = [AIBoardAction(**action) for action in raw_actions]
        return output_text, actions
