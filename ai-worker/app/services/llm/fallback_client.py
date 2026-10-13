import logging
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.services.llm.types import (
    LLMResponse,
    LLMClientProtocol,
    LLMError,
    LLMAuthenticationError,
    LLMAuthorizationError,
    LLMModelNotFoundError,
    LLMBadRequestError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMServerError,
    LLMNetworkError,
    LLMInvalidResponseError,
    sanitize_sensitive_string,
)

logger = logging.getLogger(__name__)


class FallbackExecutionResult(BaseModel):
    response: LLMResponse
    provider_used: str  # "primary" | "fallback"
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    correlation_id: str


class FallbackLLMClient:
    """
    Coordinates execution between PRIMARY (OpenAI compatible) and FALLBACK (Ollama local).
    Strictly adheres to:
    - Primary is the default and is always tried first.
    - If Primary succeeds: Ollama is strictly NEVER called.
    - If Primary encounters deterministic errors (400, 401, 403, 404, invalid auth/model):
      Ollama is strictly NOT called. Error is re-raised immediately.
    - If Primary encounters transient errors (408, 429, 5xx, timeout, network failure, invalid output):
      Calls Ollama at most once if fallback is enabled.
    - If both Primary and Ollama fail: raises composite error preserving correlation_id.
    - Strictly prevents cyclical loops (PRIMARY -> Ollama -> PRIMARY).
    """

    def __init__(
        self,
        primary_client: LLMClientProtocol,
        fallback_client: Optional[LLMClientProtocol] = None,
        fallback_enabled: bool = True
    ):
        self.primary_client = primary_client
        self.fallback_client = fallback_client
        self.fallback_enabled = fallback_enabled

    def _is_fallback_eligible(self, err: Exception) -> bool:
        """Determines if the exception is an eligible transient failure for fallback."""
        if isinstance(err, (LLMAuthenticationError, LLMAuthorizationError, LLMModelNotFoundError, LLMBadRequestError)):
            return False

        if isinstance(err, (LLMTimeoutError, LLMRateLimitError, LLMServerError, LLMNetworkError, LLMInvalidResponseError)):
            return True

        # Check is_transient flag on generic LLMError
        if isinstance(err, LLMError):
            return err.is_transient

        return False

    async def execute(
        self,
        messages: List[Dict[str, str]],
        correlation_id: Optional[str] = None
    ) -> FallbackExecutionResult:
        cid = correlation_id or str(uuid.uuid4())
        logger.info(
            f"[fallback_orchestrator] event='primary_attempt_started' correlation_id='{cid}'"
        )

        saved_primary_error: Optional[Exception] = None
        # 1. Always call PRIMARY first
        try:
            primary_resp = await self.primary_client.chat(messages, correlation_id=cid)
            logger.info(
                f"[fallback_orchestrator] event='primary_attempt_succeeded' correlation_id='{cid}' "
                f"provider='{primary_resp.provider}' model='{primary_resp.requested_model}' latency_ms={primary_resp.latency_ms}"
            )
            return FallbackExecutionResult(
                response=primary_resp,
                provider_used="primary",
                fallback_used=False,
                fallback_reason=None,
                correlation_id=cid
            )
        except Exception as primary_err:
            saved_primary_error = primary_err
            is_eligible = self._is_fallback_eligible(primary_err)
            err_cat = getattr(primary_err, "error_code", type(primary_err).__name__)
            primary_msg = sanitize_sensitive_string(str(primary_err))

            logger.warning(
                f"[fallback_orchestrator] event='primary_attempt_failed' correlation_id='{cid}' "
                f"error_category='{err_cat}' fallback_eligible={is_eligible} error='{primary_msg}'"
            )

            if not is_eligible:
                logger.error(
                    f"[fallback_orchestrator] event='fallback_ineligible_abort' correlation_id='{cid}' "
                    f"error_category='{err_cat}'. Re-raising without invoking fallback."
                )
                raise primary_err

            if not self.fallback_enabled or not self.fallback_client:
                logger.warning(
                    f"[fallback_orchestrator] event='fallback_disabled_abort' correlation_id='{cid}' "
                    f"error_category='{err_cat}'. Fallback is disabled or unconfigured."
                )
                raise primary_err

            logger.info(
                f"[fallback_orchestrator] event='fallback_attempt_started' correlation_id='{cid}' "
                f"fallback_reason='{err_cat}'. Engaging fallback provider..."
            )

        # 2. Call Fallback (Ollama)
        try:
            fallback_resp = await self.fallback_client.chat(messages, correlation_id=cid)
            logger.info(
                f"[fallback_orchestrator] event='fallback_attempt_succeeded' correlation_id='{cid}' "
                f"provider='{fallback_resp.provider}' model='{fallback_resp.requested_model}' latency_ms={fallback_resp.latency_ms}"
            )
            return FallbackExecutionResult(
                response=fallback_resp,
                provider_used="fallback",
                fallback_used=True,
                fallback_reason=primary_msg,
                correlation_id=cid
            )
        except Exception as fallback_err:
            sanitized_fallback_err = sanitize_sensitive_string(str(fallback_err))
            logger.error(
                f"[fallback_orchestrator] event='all_providers_failed' correlation_id='{cid}' "
                f"primary_error='{primary_msg}' fallback_error='{sanitized_fallback_err}'"
            )
            raise LLMServerError(
                f"All configured LLM providers failed for request [correlation_id={cid}]. "
                f"Primary: {primary_msg}; Fallback: {sanitized_fallback_err}",
                status_code=502,
                provider="fallback_orchestrator"
            )

    def execute_sync(
        self,
        messages: List[Dict[str, str]],
        correlation_id: Optional[str] = None
    ) -> FallbackExecutionResult:
        cid = correlation_id or str(uuid.uuid4())
        logger.info(
            f"[fallback_orchestrator] event='primary_attempt_started' correlation_id='{cid}'"
        )

        saved_primary_error: Optional[Exception] = None
        # 1. Always call PRIMARY first
        try:
            primary_resp = self.primary_client.chat_sync(messages, correlation_id=cid)
            logger.info(
                f"[fallback_orchestrator] event='primary_attempt_succeeded' correlation_id='{cid}' "
                f"provider='{primary_resp.provider}' model='{primary_resp.requested_model}' latency_ms={primary_resp.latency_ms}"
            )
            return FallbackExecutionResult(
                response=primary_resp,
                provider_used="primary",
                fallback_used=False,
                fallback_reason=None,
                correlation_id=cid
            )
        except Exception as primary_err:
            saved_primary_error = primary_err
            is_eligible = self._is_fallback_eligible(primary_err)
            err_cat = getattr(primary_err, "error_code", type(primary_err).__name__)
            primary_msg = sanitize_sensitive_string(str(primary_err))

            logger.warning(
                f"[fallback_orchestrator] event='primary_attempt_failed' correlation_id='{cid}' "
                f"error_category='{err_cat}' fallback_eligible={is_eligible} error='{primary_msg}'"
            )

            if not is_eligible:
                logger.error(
                    f"[fallback_orchestrator] event='fallback_ineligible_abort' correlation_id='{cid}' "
                    f"error_category='{err_cat}'. Re-raising without invoking fallback."
                )
                raise primary_err

            if not self.fallback_enabled or not self.fallback_client:
                logger.warning(
                    f"[fallback_orchestrator] event='fallback_disabled_abort' correlation_id='{cid}' "
                    f"error_category='{err_cat}'. Fallback is disabled or unconfigured."
                )
                raise primary_err

            logger.info(
                f"[fallback_orchestrator] event='fallback_attempt_started' correlation_id='{cid}' "
                f"fallback_reason='{err_cat}'. Engaging fallback provider..."
            )

        # 2. Call Fallback (Ollama)
        try:
            fallback_resp = self.fallback_client.chat_sync(messages, correlation_id=cid)
            logger.info(
                f"[fallback_orchestrator] event='fallback_attempt_succeeded' correlation_id='{cid}' "
                f"provider='{fallback_resp.provider}' model='{fallback_resp.requested_model}' latency_ms={fallback_resp.latency_ms}"
            )
            return FallbackExecutionResult(
                response=fallback_resp,
                provider_used="fallback",
                fallback_used=True,
                fallback_reason=primary_msg,
                correlation_id=cid
            )
        except Exception as fallback_err:
            sanitized_fallback_err = sanitize_sensitive_string(str(fallback_err))
            logger.error(
                f"[fallback_orchestrator] event='all_providers_failed' correlation_id='{cid}' "
                f"primary_error='{primary_msg}' fallback_error='{sanitized_fallback_err}'"
            )
            raise LLMServerError(
                f"All configured LLM providers failed for request [correlation_id={cid}]. "
                f"Primary: {primary_msg}; Fallback: {sanitized_fallback_err}",
                status_code=502,
                provider="fallback_orchestrator"
            )
