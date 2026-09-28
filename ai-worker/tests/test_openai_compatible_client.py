import pytest
import httpx
from app.services.llm.openai_compatible_client import OpenAICompatibleClient
from app.services.llm.types import (
    LLMAuthenticationError,
    LLMAuthorizationError,
    LLMModelNotFoundError,
    LLMBadRequestError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMServerError,
    LLMNetworkError,
    LLMInvalidResponseError,
    LLMResponse,
)
from app.tools.check_primary_llm import check_primary_llm
from app.config import settings


@pytest.fixture
def sample_messages():
    return [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello"}
    ]


class TestOpenAICompatibleClient:
    def test_successful_request_and_response_parsing(self, sample_messages, monkeypatch):
        captured_requests = []

        def mock_post(client_self, url, headers=None, json=None, **kwargs):
            captured_requests.append({"url": str(url), "headers": headers, "json": json})
            return httpx.Response(
                200,
                json={
                    "id": "chatcmpl-123",
                    "object": "chat.completion",
                    "created": 1677652288,
                    "model": "gpt-4o-mini-2024-07-18",
                    "choices": [{
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": '{"greeting": "Hello world"}'
                        },
                        "finish_reason": "stop"
                    }],
                    "usage": {
                        "prompt_tokens": 15,
                        "completion_tokens": 8,
                        "total_tokens": 23
                    }
                }
            )

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="secret-api-key-test-123456",
            model="gpt-4o-mini",
            timeout_seconds=30.0,
            max_retries=1
        )

        res: LLMResponse = client.chat_sync(sample_messages)

        assert len(captured_requests) == 1
        req = captured_requests[0]
        assert req["url"] == "https://api.example.com/v1/chat/completions"
        assert req["headers"]["Authorization"] == "Bearer secret-api-key-test-123456"
        assert req["json"]["model"] == "gpt-4o-mini"
        assert req["json"]["temperature"] == 0.0
        assert req["json"]["stream"] is False

        assert res.content == '{"greeting": "Hello world"}'
        assert res.provider == "openai_compatible"
        assert res.requested_model == "gpt-4o-mini"
        assert res.resolved_model == "gpt-4o-mini-2024-07-18"
        assert res.finish_reason == "stop"
        assert res.prompt_tokens == 15
        assert res.completion_tokens == 8
        assert res.total_tokens == 23
        assert res.latency_ms is not None and res.latency_ms >= 0

    def test_zero_api_key_leakage_in_error_messages(self, sample_messages, monkeypatch):
        secret_key = "sk-proj-super-secret-production-key-abc12345"

        def mock_post(client_self, url, **kwargs):
            return httpx.Response(
                401,
                text=f"Authentication failed with Bearer {secret_key}"
            )

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key=secret_key,
            model="gpt-4o-mini",
            max_retries=0
        )

        with pytest.raises(LLMAuthenticationError) as exc_info:
            client.chat_sync(sample_messages)

        error_str = str(exc_info.value)
        assert secret_key not in error_str
        assert "MASKED" in error_str
        assert exc_info.value.status_code == 401

    def test_http_401_fails_fast_without_retrying(self, sample_messages, monkeypatch):
        call_count = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal call_count
            call_count += 1
            return httpx.Response(401, json={"error": {"message": "Invalid API key"}})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="bad-key",
            model="gpt-4o-mini",
            max_retries=3
        )

        with pytest.raises(LLMAuthenticationError):
            client.chat_sync(sample_messages)

        # Must not retry deterministic 401
        assert call_count == 1

    def test_http_403_fails_fast_without_retrying(self, sample_messages, monkeypatch):
        call_count = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal call_count
            call_count += 1
            return httpx.Response(403, json={"error": {"message": "Forbidden"}})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="forbidden-key",
            model="gpt-4o-mini",
            max_retries=3
        )

        with pytest.raises(LLMAuthorizationError):
            client.chat_sync(sample_messages)

        assert call_count == 1

    def test_http_404_fails_fast_without_retrying(self, sample_messages, monkeypatch):
        call_count = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal call_count
            call_count += 1
            return httpx.Response(404, json={"error": {"message": "Model not found"}})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="non-existent-model",
            max_retries=3
        )

        with pytest.raises(LLMModelNotFoundError):
            client.chat_sync(sample_messages)

        assert call_count == 1

    def test_http_400_bad_request_fails_fast(self, sample_messages, monkeypatch):
        call_count = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal call_count
            call_count += 1
            return httpx.Response(400, json={"error": {"message": "Bad request"}})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=2
        )

        with pytest.raises(LLMBadRequestError):
            client.chat_sync(sample_messages)

        assert call_count == 1

    def test_transient_http_503_retries_and_succeeds(self, sample_messages, monkeypatch):
        attempts = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                return httpx.Response(503, text="Service Unavailable")
            return httpx.Response(
                200,
                json={
                    "model": "gpt-4o-mini",
                    "choices": [{"message": {"content": '{"ok": true}'}}]
                }
            )

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=1
        )

        res = client.chat_sync(sample_messages)
        assert attempts == 2
        assert res.content == '{"ok": true}'

    def test_transient_http_429_retries_bounded(self, sample_messages, monkeypatch):
        attempts = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal attempts
            attempts += 1
            return httpx.Response(429, text="Rate Limit Exceeded")

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=1
        )

        with pytest.raises(LLMRateLimitError):
            client.chat_sync(sample_messages)

        # 1 initial + 1 retry = 2 attempts total
        assert attempts == 2

    def test_network_connection_error_retries_bounded(self, sample_messages, monkeypatch):
        attempts = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal attempts
            attempts += 1
            raise httpx.ConnectError("Connection refused by peer")

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="http://127.0.0.1:9999",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=1
        )

        with pytest.raises(LLMNetworkError) as exc_info:
            client.chat_sync(sample_messages)

        assert attempts == 2
        assert "Connection failed" in str(exc_info.value)

    def test_timeout_error_retries_bounded(self, sample_messages, monkeypatch):
        attempts = 0

        def mock_post(client_self, url, **kwargs):
            nonlocal attempts
            attempts += 1
            raise httpx.ReadTimeout("Read timed out")

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            timeout_seconds=5.0,
            max_retries=1
        )

        with pytest.raises(LLMTimeoutError) as exc_info:
            client.chat_sync(sample_messages)

        assert attempts == 2
        assert "Request timed out" in str(exc_info.value)

    def test_malformed_non_json_response_raises_invalid_response(self, sample_messages, monkeypatch):
        def mock_post(client_self, url, **kwargs):
            return httpx.Response(200, text="<html><body>Gateway Error</body></html>")

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=0
        )

        with pytest.raises(LLMInvalidResponseError) as exc_info:
            client.chat_sync(sample_messages)

        assert "not valid JSON" in str(exc_info.value)

    def test_missing_choices_raises_invalid_response(self, sample_messages, monkeypatch):
        def mock_post(client_self, url, **kwargs):
            return httpx.Response(200, json={"model": "test", "choices": []})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=0
        )

        with pytest.raises(LLMInvalidResponseError) as exc_info:
            client.chat_sync(sample_messages)

        assert "missing non-empty 'choices'" in str(exc_info.value)

    def test_empty_content_raises_invalid_response(self, sample_messages, monkeypatch):
        def mock_post(client_self, url, **kwargs):
            return httpx.Response(200, json={"choices": [{"message": {"content": "   "}}]})

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        client = OpenAICompatibleClient(
            base_url="https://api.example.com/v1",
            api_key="valid-key",
            model="gpt-4o-mini",
            max_retries=0
        )

        with pytest.raises(LLMInvalidResponseError) as exc_info:
            client.chat_sync(sample_messages)

        assert "empty or null" in str(exc_info.value)


class TestCheckPrimaryLlmTool:
    def test_check_tool_success_flow(self, monkeypatch, capsys):
        monkeypatch.setattr(settings, "LLM_PRIMARY_BASE_URL", "https://api.primary.com/v1")
        monkeypatch.setattr(settings, "LLM_PRIMARY_API_KEY", "valid-key-12345")
        monkeypatch.setattr(settings, "LLM_PRIMARY_MODEL", "gpt-4o-mini")

        def mock_post(client_self, url, **kwargs):
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": '{"status": "ok"}'}}]}
            )

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        exit_code = check_primary_llm()
        assert exit_code == 0
        captured = capsys.readouterr().out
        assert "Primary LLM configuration: VALID" in captured
        assert "Authentication: OK" in captured
        assert "Chat completion: OK" in captured
        assert "JSON response: OK" in captured
        assert "valid-key-12345" not in captured

    def test_check_tool_authentication_failure(self, monkeypatch, capsys):
        monkeypatch.setattr(settings, "LLM_PRIMARY_BASE_URL", "https://api.primary.com/v1")
        monkeypatch.setattr(settings, "LLM_PRIMARY_API_KEY", "invalid-key")
        monkeypatch.setattr(settings, "LLM_PRIMARY_MODEL", "gpt-4o-mini")

        def mock_post(client_self, url, **kwargs):
            return httpx.Response(401, text="Unauthorized: Invalid key")

        monkeypatch.setattr(httpx.Client, "post", mock_post)

        exit_code = check_primary_llm()
        assert exit_code == 1
        captured = capsys.readouterr().out
        assert "Primary LLM configuration: INVALID" in captured
        assert "authentication failure" in captured
        assert "invalid-key" not in captured
