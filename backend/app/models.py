from datetime import datetime
from typing import Any
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    token: str
    username: str
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=1)


class CreateStudentRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(default="changeme", min_length=1)


class StudentResponse(BaseModel):
    id: str
    username: str
    created_at: datetime


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


class AIChatRequest(BaseModel):
    prompt: str = Field(min_length=1, description="User chat prompt")


class AIBoardAction(BaseModel):
    type: Literal["move_card", "create_card", "edit_card"]
    card_title: str
    from_column_title: str | None = None
    to_column_title: str | None = None
    details: str | None = None


class AIChatResponse(BaseModel):
    model: str
    output_text: str
    applied_actions: list[str] = Field(default_factory=list)
    board_state_version: int
