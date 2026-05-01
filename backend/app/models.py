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


class AIConnectivityRequest(BaseModel):
    prompt: str = Field(
        default="What is 2+2? Reply with only the number.",
        min_length=1,
        description="Prompt sent to Anthropic to verify connectivity.",
    )


class AIConnectivityResponse(BaseModel):
    model: str
    output_text: str
