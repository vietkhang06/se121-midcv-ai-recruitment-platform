import re
from typing import Optional, Protocol, runtime_checkable
from pydantic import BaseModel, Field


class LLMResponse(BaseModel):
    content: str
    provider: str
    requested_model: str
    resolved_model: Optional[str] = None
    finish_reason: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None


@runtime_checkable
class LLMClientProtocol(Protocol):
    async def chat(
        self,
        messages: list[dict[str, str]],
        correlation_id: str | None = None,
    ) -> LLMResponse:
        ...

    def chat_sync(
        self,
        messages: list[dict[str, str]],
        correlation_id: str | None = None,
    ) -> LLMResponse:
        ...


def sanitize_sensitive_string(text: str) -> str:
    """Masks API keys, tokens, and Authorization headers in logs and exception messages."""
    if not text:
        return ""
    # Mask any patterns looking like API keys / bearer tokens
    masked = re.sub(r"(sk-[a-zA-Z0-9_\-]{6})[a-zA-Z0-9_\-]+", r"\1***[MASKED]", text)
    masked = re.sub(r"(Bearer\s+)[a-zA-Z0-9_\.\-]+", r"\1***[MASKED]", masked, flags=re.IGNORECASE)
    masked = re.sub(r"([a-f0-9]{32,})", r"***[MASKED_HASH]***", masked, flags=re.IGNORECASE)
    return masked


class LLMError(Exception):
    """Base exception for all LLM errors. Guaranteed never to leak secrets."""
    def __init__(
        self,
        message: str,
        provider: str = "llm",
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        is_transient: bool = False
    ):
        self.provider = provider
        self.status_code = status_code
        self.error_code = error_code or "llm_error"
        self.is_transient = is_transient
        self.raw_message = message
        sanitized = sanitize_sensitive_string(message)
        super().__init__(f"[{provider.upper()}] {sanitized}")


class LLMAuthenticationError(LLMError):
    """HTTP 401 - Invalid or expired API key. Deterministic, NOT fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=401,
            error_code="authentication_failed",
            is_transient=False
        )


class LLMAuthorizationError(LLMError):
    """HTTP 403 - Forbidden access / insufficient permissions. Deterministic, NOT fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=403,
            error_code="authorization_failed",
            is_transient=False
        )


class LLMModelNotFoundError(LLMError):
    """HTTP 404 - Model not found or endpoint invalid. Deterministic, NOT fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=404,
            error_code="model_not_found",
            is_transient=False
        )


class LLMBadRequestError(LLMError):
    """HTTP 400 - Bad request payload or schema. Deterministic, NOT fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=400,
            error_code="bad_request",
            is_transient=False
        )


class LLMTimeoutError(LLMError):
    """HTTP 408 or client timeout. Transient, fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=408,
            error_code="timeout",
            is_transient=True
        )


class LLMRateLimitError(LLMError):
    """HTTP 429 - Rate limit reached or quota exceeded. Transient, fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=429,
            error_code="rate_limit_exceeded",
            is_transient=True
        )


class LLMServerError(LLMError):
    """HTTP 5xx - Provider internal server error or outage. Transient, fallback eligible."""
    def __init__(self, message: str, status_code: int = 500, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=status_code,
            error_code="server_error",
            is_transient=True
        )


class LLMNetworkError(LLMError):
    """Connection refused, DNS failure, network unreachable. Transient, fallback eligible."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=503,
            error_code="network_error",
            is_transient=True
        )


class LLMInvalidResponseError(LLMError):
    """Response was received but invalid structure (empty choices, missing message, malformed json)."""
    def __init__(self, message: str, provider: str = "llm"):
        super().__init__(
            message=message,
            provider=provider,
            status_code=502,
            error_code="invalid_response",
            is_transient=True
        )
