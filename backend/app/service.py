from typing import Protocol

from app.models import BoardResponse
from app.models import AIConnectivityResponse
from app.repository import BoardRepository


class BoardService:
    def __init__(self, repository: BoardRepository) -> None:
        self._repository = repository

    def get_board(self, username: str) -> BoardResponse:
        record = self._repository.get_board(username)
        return BoardResponse(**record.__dict__)

    def update_board(self, username: str, state: dict) -> BoardResponse:
        record = self._repository.update_board(username=username, state=state)
        return BoardResponse(**record.__dict__)


class AIConnectivityClient(Protocol):
    def connectivity_check(self, prompt: str) -> str:
        ...


class AIService:
    def __init__(self, client: AIConnectivityClient, model: str) -> None:
        self._client = client
        self._model = model

    def connectivity_check(self, prompt: str) -> AIConnectivityResponse:
        output_text = self._client.connectivity_check(prompt)
        return AIConnectivityResponse(model=self._model, output_text=output_text)
