import sys
from types import SimpleNamespace

import pytest

from app.ai import AnthropicConnectivityClient
from app.errors import AIProviderError


class FakeTextBlock:
    type = "text"

    def __init__(self, text: str) -> None:
        self.text = text


class FakeResponse:
    def __init__(self, content) -> None:
        self.content = content


class FakeMessagesAPI:
    def __init__(self, behavior: str) -> None:
        self.behavior = behavior

    def create(self, **_kwargs):
        if self.behavior == "success":
            return FakeResponse([FakeTextBlock("4")])
        if self.behavior == "empty":
            return FakeResponse([])
        raise RuntimeError("provider failed")


class FakeAnthropic:
    def __init__(self, api_key: str, behavior: str = "success") -> None:
        assert api_key == "test-key"
        self.messages = FakeMessagesAPI(behavior=behavior)


def install_fake_anthropic(monkeypatch, behavior: str) -> None:
    def factory(api_key: str):
        return FakeAnthropic(api_key=api_key, behavior=behavior)

    monkeypatch.setitem(sys.modules, "anthropic", SimpleNamespace(Anthropic=factory))


def test_connectivity_client_returns_text(monkeypatch) -> None:
    install_fake_anthropic(monkeypatch, behavior="success")
    client = AnthropicConnectivityClient(api_key="test-key", model="claude-sonnet-4-5-20250929")

    result = client.connectivity_check("What is 2+2?")

    assert result == "4"


def test_connectivity_client_rejects_empty_response(monkeypatch) -> None:
    install_fake_anthropic(monkeypatch, behavior="empty")
    client = AnthropicConnectivityClient(api_key="test-key", model="claude-sonnet-4-5-20250929")

    with pytest.raises(AIProviderError, match="did not include text"):
        client.connectivity_check("What is 2+2?")


def test_connectivity_client_maps_provider_error(monkeypatch) -> None:
    install_fake_anthropic(monkeypatch, behavior="error")
    client = AnthropicConnectivityClient(api_key="test-key", model="claude-sonnet-4-5-20250929")

    with pytest.raises(AIProviderError, match="Anthropic request failed"):
        client.connectivity_check("What is 2+2?")
