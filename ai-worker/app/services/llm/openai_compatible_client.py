import time
import logging
from typing import Optional, Dict, Any, List
import httpx

from app.services.llm.types import (
    LLMResponse,
    LLMClientProtocol,
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


class OpenAICompatibleClient:
    """
    OpenAI-compatible LLM client implementing LLMClientProtocol.
    Calls POST {base_url}/chat/completions.
    Strictly conforms to:
    - Bearer authentication.
    - Zero secret leakage in logs or exceptions.
    - Detailed error mapping (401, 403, 404, 408, 429, 5xx, network, timeout).
    - Bounded retry strictly for transient errors only (408, 429, 5xx, network).
    - Deterministic errors (400, 401, 403, 404) are NEVER retried.
    - Captures resolved model, finish reason, usage metrics, and latency.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout_seconds: float = 180.0,
        max_retries: int = 1,
        temperature: float = 0.0
    ):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""
        self.model = model or ""
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(0, max_retries)
        self.temperature = temperature
        self.provider = "openai_compatible"

    def _build_request(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        return {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "stream": False
        }

    def _build_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _parse_response_data(
        self,
        res_data: Any,
        latency_ms: int
    ) -> LLMResponse:
        if not isinstance(res_data, dict):
            raise LLMInvalidResponseError(
                "Response payload is not a valid JSON object.",
                provider=self.provider
            )

        choices = res_data.get("choices")
        if not isinstance(choices, list) or len(choices) == 0:
            raise LLMInvalidResponseError(
                "Response JSON missing non-empty 'choices' list.",
                provider=self.provider
            )

        first_choice = choices[0]
        if not isinstance(first_choice, dict) or "message" not in first_choice or not isinstance(first_choice["message"], dict):
            raise LLMInvalidResponseError(
                "First choice missing valid 'message' object.",
                provider=self.provider
            )

        content = first_choice["message"].get("content")
        if content is None or not isinstance(content, str) or not content.strip():
            raise LLMInvalidResponseError(
                "Response message content is empty or null.",
                provider=self.provider
            )

        finish_reason = first_choice.get("finish_reason")
        resolved_model = res_data.get("model")
        usage = res_data.get("usage") or {}
        prompt_tokens = usage.get("prompt_tokens")
        completion_tokens = usage.get("completion_tokens")
        total_tokens = usage.get("total_tokens")

        return LLMResponse(
            content=content.strip(),
            provider=self.provider,
            requested_model=self.model,
            resolved_model=resolved_model,
            finish_reason=finish_reason,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms
        )

    def _map_http_error(self, status_code: int, response_text: str) -> None:
        sanitized_detail = sanitize_sensitive_string(response_text[:300])
        msg = f"HTTP {status_code}: {sanitized_detail}"
        if status_code == 400:
            raise LLMBadRequestError(msg, provider=self.provider)
        elif status_code == 401:
            raise LLMAuthenticationError(msg, provider=self.provider)
        elif status_code == 403:
            raise LLMAuthorizationError(msg, provider=self.provider)
        elif status_code == 404:
            raise LLMModelNotFoundError(msg, provider=self.provider)
        elif status_code == 408:
            raise LLMTimeoutError(msg, provider=self.provider)
        elif status_code == 429:
            raise LLMRateLimitError(msg, provider=self.provider)
        elif 500 <= status_code <= 599:
            raise LLMServerError(msg, status_code=status_code, provider=self.provider)
        else:
            raise LLMServerError(msg, status_code=status_code, provider=self.provider)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        correlation_id: Optional[str] = None
    ) -> LLMResponse:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_request(messages)

        attempts = 0
        last_error = None

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    resp = await client.post(url, headers=headers, json=payload)
            except (httpx.ConnectError, httpx.NetworkError) as conn_err:
                logger.warning(
                    f"[{self.provider}] Connection error (attempt {attempts}/{self.max_retries + 1}): "
                    f"{sanitize_sensitive_string(str(conn_err))}"
                )
                last_error = LLMNetworkError(
                    f"Connection failed to {self.base_url}: {str(conn_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as to_err:
                logger.warning(
                    f"[{self.provider}] Timeout error (attempt {attempts}/{self.max_retries + 1}): "
                    f"{sanitize_sensitive_string(str(to_err))}"
                )
                last_error = LLMTimeoutError(
                    f"Request timed out after {self.timeout_seconds}s: {str(to_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            latency_ms = int((time.time() - t0) * 1000)

            if resp.is_error:
                status_code = resp.status_code
                logger.warning(f"[{self.provider}] HTTP {status_code} received (attempt {attempts}/{self.max_retries + 1})")
                try:
                    self._map_http_error(status_code, resp.text)
                except (LLMTimeoutError, LLMRateLimitError, LLMServerError) as transient_err:
                    last_error = transient_err
                    if attempts <= self.max_retries:
                        continue
                    raise
                # Deterministic errors (400, 401, 403, 404) are raised immediately without retry

            try:
                res_data = resp.json()
            except Exception as json_err:
                last_error = LLMInvalidResponseError(
                    f"HTTP response payload is not valid JSON: {str(json_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            return self._parse_response_data(res_data, latency_ms)

        if last_error:
            raise last_error
        raise LLMServerError("Max retries exceeded with unknown failure.", provider=self.provider)

    def chat_sync(
        self,
        messages: List[Dict[str, str]],
        correlation_id: Optional[str] = None
    ) -> LLMResponse:
        url = f"{self.base_url}/chat/completions"
        headers = self._build_headers()
        payload = self._build_request(messages)

        attempts = 0
        last_error = None

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    resp = client.post(url, headers=headers, json=payload)
            except (httpx.ConnectError, httpx.NetworkError) as conn_err:
                logger.warning(
                    f"[{self.provider}] Connection error (attempt {attempts}/{self.max_retries + 1}): "
                    f"{sanitize_sensitive_string(str(conn_err))}"
                )
                last_error = LLMNetworkError(
                    f"Connection failed to {self.base_url}: {str(conn_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as to_err:
                logger.warning(
                    f"[{self.provider}] Timeout error (attempt {attempts}/{self.max_retries + 1}): "
                    f"{sanitize_sensitive_string(str(to_err))}"
                )
                last_error = LLMTimeoutError(
                    f"Request timed out after {self.timeout_seconds}s: {str(to_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            latency_ms = int((time.time() - t0) * 1000)

            if resp.is_error:
                status_code = resp.status_code
                try:
                    self._map_http_error(status_code, resp.text)
                except (LLMTimeoutError, LLMRateLimitError, LLMServerError) as transient_err:
                    last_error = transient_err
                    if attempts <= self.max_retries:
                        continue
                    raise
                # Deterministic errors are raised immediately without retry

            try:
                res_data = resp.json()
            except Exception as json_err:
                last_error = LLMInvalidResponseError(
                    f"HTTP response payload is not valid JSON: {str(json_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            return self._parse_response_data(res_data, latency_ms)

        if last_error:
            raise last_error
        raise LLMServerError("Max retries exceeded with unknown failure.", provider=self.provider)
