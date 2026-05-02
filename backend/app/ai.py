import json

from app.errors import AIProviderError


class AnthropicConnectivityClient:
    def __init__(self, api_key: str, model: str) -> None:
        try:
            from anthropic import Anthropic
        except ImportError as exc:  # pragma: no cover - requires broken install
            raise AIProviderError("Anthropic SDK is not installed.") from exc

        self._client = Anthropic(api_key=api_key)
        self._model = model

    def _request_text(self, prompt: str, max_tokens: int = 64) -> str:
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=max_tokens,
                temperature=0,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:  # pragma: no cover - network/provider failure
            raise AIProviderError("Anthropic request failed.") from exc

        parts = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                parts.append(getattr(block, "text", ""))

        text = "".join(parts).strip()
        if not text:
            raise AIProviderError("Anthropic response did not include text.")

        return text

    def connectivity_check(self, prompt: str) -> str:
        return self._request_text(prompt=prompt, max_tokens=64)

    def structured_board_response(self, prompt: str, board_context: str) -> dict:
        schema_prompt = (
            "You are helping with a Kanban board. "
            "Return ONLY valid JSON with this shape: "
            "{\"message\": string, \"actions\": ["
            "{\"type\": \"move_card\"|\"create_card\"|\"edit_card\", "
            "\"card_title\": string, "
            "\"from_column_title\": string|null, "
            "\"to_column_title\": string|null, "
            "\"details\": string|null}]}"
            "\nUse empty actions list when no board update is required."
            f"\n\nBoard context:\n{board_context}"
            f"\n\nUser request:\n{prompt}"
        )

        raw_text = self._request_text(prompt=schema_prompt, max_tokens=512)

        try:
            payload = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise AIProviderError("Anthropic response was not valid JSON.") from exc

        if not isinstance(payload, dict):
            raise AIProviderError("Anthropic JSON response must be an object.")

        message = payload.get("message")
        actions = payload.get("actions")
        if not isinstance(message, str) or not isinstance(actions, list):
            raise AIProviderError("Anthropic JSON response did not match expected schema.")

        return payload
