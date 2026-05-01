class BackendError(Exception):
    """Base class for backend-specific exceptions."""


class NotFoundError(BackendError):
    """Raised when an expected resource is not found."""


class NotConfiguredError(BackendError):
    """Raised when required runtime configuration is missing."""


class PersistenceError(BackendError):
    """Raised for persistence/database failures."""


class AIProviderError(BackendError):
    """Raised when the AI provider call fails or returns invalid output."""
