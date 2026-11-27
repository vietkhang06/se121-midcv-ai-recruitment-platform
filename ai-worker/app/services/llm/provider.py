"""Shared configuration for calls to the worker's LLM provider."""

from app.config import settings
from app.services.llm.openai_compatible_client import OpenAICompatibleClient


def configured_chat_client() -> OpenAICompatibleClient:
    return OpenAICompatibleClient(
        base_url=settings.LLM_PRIMARY_BASE_URL,
        api_key=settings.LLM_PRIMARY_API_KEY,
        model=settings.LLM_PRIMARY_MODEL,
        timeout_seconds=settings.LLM_PRIMARY_TIMEOUT_SECONDS,
        max_retries=settings.LLM_PRIMARY_MAX_RETRIES,
        require_configuration=True,
        enabled=settings.LLM_PRIMARY_ENABLED,
    )
