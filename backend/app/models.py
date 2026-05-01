from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class BoardUpdateRequest(BaseModel):
    state: dict[str, Any] = Field(description="Board state payload")


class BoardResponse(BaseModel):
    id: str
    username: str
    title: str
    state: dict[str, Any]
    state_version: int
    updated_at: datetime
