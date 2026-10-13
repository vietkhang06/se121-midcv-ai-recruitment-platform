import time
import json
import asyncio
import logging
from typing import Optional, Dict, Any, List
import httpx

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


def classify_openai_compatible_error(
    status_code: int,
    response_text: str,
    provider: str = "openai_compatible"
) -> LLMError:
    """
    Defensively classifies HTTP errors from OpenAI-compatible gateways.
    Distinguishes deterministic conditions (model not found, invalid auth, bad request)
    from transient failures (network drop, gateway timeout, true 5xx server outage).

    Crucially detects when an intermediate gateway (e.g. 9Router, LiteLLM, reverse proxies)
    wraps an upstream 404 NOT_FOUND into an HTTP 500/502/503/504 response, classifying it
    as LLMModelNotFoundError to prevent futile retries or inappropriate Ollama fallbacks.
    """
    sanitized_detail = sanitize_sensitive_string(response_text[:400]) if response_text else ""
    msg = f"HTTP {status_code}: {sanitized_detail}".strip()

    # Direct deterministic status codes
    if status_code == 400:
        return LLMBadRequestError(msg, provider=provider)
    elif status_code == 401:
        return LLMAuthenticationError(msg, provider=provider)
    elif status_code == 403:
        return LLMAuthorizationError(msg, provider=provider)
    elif status_code == 404:
        return LLMModelNotFoundError(msg, provider=provider)
    elif status_code == 408:
        return LLMTimeoutError(msg, provider=provider)
    elif status_code == 429:
        return LLMRateLimitError(msg, provider=provider)

    # For 5xx status codes, inspect structured error payloads for upstream signals
    if 500 <= status_code <= 599 and response_text:
        try:
            parsed = json.loads(response_text)
            err_data = parsed.get("error") if isinstance(parsed, dict) else None
            if isinstance(err_data, dict):
                code = str(err_data.get("code", "")).strip().lower()
                err_status = str(err_data.get("status", "")).strip().upper()
                type_ = str(err_data.get("type", "")).strip().lower()
                message = str(err_data.get("message", "")).strip().lower()

                # Upstream Model Not Found indicators
                is_model_not_found = (
                    err_status == "NOT_FOUND"
                    or code in ("404", "model_not_found", "resource_not_found")
                    or type_ == "model_not_found_error"
                    or "[404]" in message
                    or "requested entity was not found" in message
                    or "does not exist" in message
                    or "model_not_found" in message
                )
                if is_model_not_found:
                    return LLMModelNotFoundError(
                        f"HTTP {status_code} (Upstream 404 NOT_FOUND): {sanitized_detail}",
                        provider=provider
                    )

                # Upstream Authentication Failure indicators
                is_auth_error = (
                    err_status in ("UNAUTHENTICATED", "UNAUTHORIZED")
                    or code in ("401", "invalid_api_key", "unauthenticated", "invalid_token")
                    or type_ == "authentication_error"
                    or "[401]" in message
                    or "invalid api key" in message
                    or "incorrect api key" in message
                )
                if is_auth_error:
                    return LLMAuthenticationError(
                        f"HTTP {status_code} (Upstream 401 UNAUTHENTICATED): {sanitized_detail}",
                        provider=provider
                    )

                # Upstream Authorization Failure indicators
                is_forbidden = (
                    err_status in ("PERMISSION_DENIED", "FORBIDDEN")
                    or code in ("403", "permission_denied", "forbidden")
                    or "[403]" in message
                    or "permission denied" in message
                )
                if is_forbidden:
                    return LLMAuthorizationError(
                        f"HTTP {status_code} (Upstream 403 PERMISSION_DENIED): {sanitized_detail}",
                        provider=provider
                    )

                # Upstream Bad Request / Schema Failure indicators
                is_bad_request = (
                    err_status in ("INVALID_ARGUMENT", "BAD_REQUEST")
                    or code in ("400", "invalid_request_error", "bad_request")
                    or "[400]" in message
                )
                if is_bad_request:
                    return LLMBadRequestError(
                        f"HTTP {status_code} (Upstream 400 INVALID_ARGUMENT): {sanitized_detail}",
                        provider=provider
                    )
        except Exception:
            pass

    return LLMServerError(msg, status_code=status_code, provider=provider)



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
        raise classify_openai_compatible_error(status_code, response_text, provider=self.provider)

    def _classify_body(self, content_type: str, raw_bytes: bytes) -> str:
        if not raw_bytes:
            return "EMPTY"
        ct = (content_type or "").lower()
        if "text/event-stream" in ct or raw_bytes.lstrip().startswith(b"data:"):
            return "SSE"
        stripped = raw_bytes.strip()
        if stripped.lower().startswith(b"<html") or stripped.lower().startswith(b"<!doctype html"):
            return "HTML"
        if "application/json" in ct or (stripped.startswith(b"{") and stripped.endswith(b"}")) or (stripped.startswith(b"[") and stripped.endswith(b"]")):
            return "JSON"
        if "text/plain" in ct:
            return "TEXT"
        return "UNKNOWN"

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
        timeout_config = httpx.Timeout(
            timeout=self.timeout_seconds,
            connect=min(10.0, self.timeout_seconds),
            read=self.timeout_seconds,
            write=min(15.0, self.timeout_seconds),
            pool=min(10.0, self.timeout_seconds)
        )

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                async with httpx.AsyncClient(timeout=timeout_config) as client:
                    resp = await asyncio.wait_for(
                        client.post(url, headers=headers, json=payload),
                        timeout=self.timeout_seconds
                    )
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
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout, asyncio.TimeoutError) as to_err:
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
            content_type = resp.headers.get("content-type", "")
            raw_bytes = resp.content or b""
            body_length = len(raw_bytes)
            classification = self._classify_body(content_type, raw_bytes)

            logger.info(
                f"[{self.provider}] status={resp.status_code} content_type='{content_type}' "
                f"body_length={body_length} body_classification='{classification}' "
                f"model='{self.model}' latency_ms={latency_ms} correlation_id='{correlation_id}'"
            )

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

            if classification == "SSE":
                last_error = LLMInvalidResponseError(
                    "Primary provider returned an unexpected SSE stream instead of non-streamed JSON response.",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            if classification == "EMPTY":
                last_error = LLMInvalidResponseError(
                    "Primary provider returned an empty response body.",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

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
        timeout_config = httpx.Timeout(
            timeout=self.timeout_seconds,
            connect=min(10.0, self.timeout_seconds),
            read=self.timeout_seconds,
            write=min(15.0, self.timeout_seconds),
            pool=min(10.0, self.timeout_seconds)
        )

        while attempts <= self.max_retries:
            attempts += 1
            t0 = time.time()
            try:
                with httpx.Client(timeout=timeout_config) as client:
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
            content_type = resp.headers.get("content-type", "")
            raw_bytes = resp.content or b""
            body_length = len(raw_bytes)
            classification = self._classify_body(content_type, raw_bytes)

            logger.info(
                f"[{self.provider}] status={resp.status_code} content_type='{content_type}' "
                f"body_length={body_length} body_classification='{classification}' "
                f"model='{self.model}' latency_ms={latency_ms} correlation_id='{correlation_id}'"
            )

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

            if classification == "SSE":
                last_error = LLMInvalidResponseError(
                    "Primary provider returned an unexpected SSE stream instead of non-streamed JSON response.",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

            if classification == "EMPTY":
                last_error = LLMInvalidResponseError(
                    "Primary provider returned an empty response body.",
                    provider=self.provider
                )
                if attempts <= self.max_retries:
                    continue
                raise last_error

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
