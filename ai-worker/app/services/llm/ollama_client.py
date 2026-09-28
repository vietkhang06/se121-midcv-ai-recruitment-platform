import time
import logging
from typing import Optional, Dict, Any, List
import httpx

from app.services.llm.types import (
    LLMResponse,
    LLMClientProtocol,
    LLMBadRequestError,
    LLMModelNotFoundError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMServerError,
    LLMNetworkError,
    LLMInvalidResponseError,
    sanitize_sensitive_string,
)

logger = logging.getLogger(__name__)


class OllamaClient:
    """
    Standardized Ollama client implementing LLMClientProtocol.
    Calls POST {base_url}/api/chat.
    Strictly isolated:
    - Does NOT process files.
    - Does NOT write to database.
    - Only called as fallback when primary LLM encounters eligible transient failure.
    - Returns standardized LLMResponse.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout_seconds: float = 180.0,
        max_retries: int = 0,
        temperature: float = 0.0
    ):
        self.base_url = (base_url or "http://127.0.0.1:11434").rstrip("/")
        self.model = model or "dna5rm/granite4.2:3b-8k"
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(0, max_retries)
        self.temperature = temperature
        self.provider = "ollama"

    def _build_payload(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        return {
            "model": self.model,
            "messages": messages,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": self.temperature
            }
        }

    def _parse_response_data(self, res_data: Any, latency_ms: int) -> LLMResponse:
        if not isinstance(res_data, dict):
            raise LLMInvalidResponseError(
                "Ollama response payload is not valid JSON.",
                provider=self.provider
            )

        message = res_data.get("message")
        if not isinstance(message, dict):
            raise LLMInvalidResponseError(
                "Ollama response missing valid 'message' object.",
                provider=self.provider
            )

        content = message.get("content")
        if content is None or not isinstance(content, str) or not content.strip():
            raise LLMInvalidResponseError(
                "Ollama response message content is empty or null.",
                provider=self.provider
            )

        resolved_model = res_data.get("model") or self.model
        prompt_eval = res_data.get("prompt_eval_count")
        eval_count = res_data.get("eval_count")
        total = (prompt_eval + eval_count) if (prompt_eval is not None and eval_count is not None) else None

        return LLMResponse(
            content=content.strip(),
            provider=self.provider,
            requested_model=self.model,
            resolved_model=resolved_model,
            finish_reason=res_data.get("done_reason") or "stop",
            prompt_tokens=prompt_eval,
            completion_tokens=eval_count,
            total_tokens=total,
            latency_ms=latency_ms
        )

    def _map_http_error(self, status_code: int, response_text: str) -> None:
        sanitized = sanitize_sensitive_string(response_text[:300])
        msg = f"HTTP {status_code}: {sanitized}"
        if status_code == 404:
            raise LLMModelNotFoundError(msg, provider=self.provider)
        elif status_code == 400:
            raise LLMBadRequestError(msg, provider=self.provider)
        elif status_code == 408:
            raise LLMTimeoutError(msg, provider=self.provider)
        elif status_code == 429:
            raise LLMRateLimitError(msg, provider=self.provider)
        else:
            raise LLMServerError(msg, status_code=status_code, provider=self.provider)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        correlation_id: Optional[str] = None
    ) -> LLMResponse:
        url = f"{self.base_url}/api/chat"
        payload = self._build_payload(messages)

        attempts = 0
        last_error = None

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    resp = await client.post(url, json=payload)
            except (httpx.ConnectError, httpx.NetworkError) as conn_err:
                last_error = LLMNetworkError(
                    f"Connection failed to Ollama at {self.base_url}: {str(conn_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as to_err:
                last_error = LLMTimeoutError(
                    f"Ollama request timed out after {self.timeout_seconds}s: {str(to_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            latency_ms = int((time.time() - t0) * 1000)

            if resp.is_error:
                try:
                    self._map_http_error(resp.status_code, resp.text)
                except (LLMTimeoutError, LLMRateLimitError, LLMServerError) as transient_err:
                    last_error = transient_err
                    if attempts <= self.max_retries:
                        continue
                    raise

            try:
                res_data = resp.json()
            except Exception as json_err:
                last_error = LLMInvalidResponseError(
                    f"Ollama response not valid JSON: {str(json_err)}",
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
        url = f"{self.base_url}/api/chat"
        payload = self._build_payload(messages)

        attempts = 0
        last_error = None

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    resp = client.post(url, json=payload)
            except (httpx.ConnectError, httpx.NetworkError) as conn_err:
                last_error = LLMNetworkError(
                    f"Connection failed to Ollama at {self.base_url}: {str(conn_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as to_err:
                last_error = LLMTimeoutError(
                    f"Ollama request timed out after {self.timeout_seconds}s: {str(to_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            latency_ms = int((time.time() - t0) * 1000)

            if resp.is_error:
                try:
                    self._map_http_error(resp.status_code, resp.text)
                except (LLMTimeoutError, LLMRateLimitError, LLMServerError) as transient_err:
                    last_error = transient_err
                    if attempts <= self.max_retries:
                        continue
                    raise

            try:
                res_data = resp.json()
            except Exception as json_err:
                last_error = LLMInvalidResponseError(
                    f"Ollama response not valid JSON: {str(json_err)}",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            return self._parse_response_data(res_data, latency_ms)

        if last_error:
            raise last_error
        raise LLMServerError("Max retries exceeded with unknown failure.", provider=self.provider)
