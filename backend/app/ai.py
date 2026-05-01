from app.errors import AIProviderError


class AnthropicConnectivityClient:
    def __init__(self, api_key: str, model: str) -> None:
        try:
            from anthropic import Anthropic
        except ImportError as exc:  # pragma: no cover - requires broken install
            raise AIProviderError("Anthropic SDK is not installed.") from exc

        self._client = Anthropic(api_key=api_key)
        self._model = model

    def connectivity_check(self, prompt: str) -> str:
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=64,
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
