from app.models import BoardResponse
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
