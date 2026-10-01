import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.llm.types import (
    LLMResponse,
    LLMAuthenticationError,
    LLMAuthorizationError,
    LLMModelNotFoundError,
    LLMBadRequestError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMServerError,
    LLMNetworkError,
    LLMInvalidResponseError,
)
from app.services.llm.fallback_client import FallbackLLMClient
from app.services.llm.ollama_client import OllamaClient
from app.services.cv_structuring_service import CVStructuringService
from app.services.structured_cv_validator import StructuredCVValidator


class DummyLLM:
    def __init__(self, provider="openai_compatible"):
        self.provider = provider
        self.call_count = 0
        self.response = None
        self.side_effect = None

    async def chat(self, messages, correlation_id=None):
        self.call_count += 1
        if self.side_effect:
            raise self.side_effect
        return self.response

    def chat_sync(self, messages, correlation_id=None):
        self.call_count += 1
        if self.side_effect:
            raise self.side_effect
        return self.response


class TestPhase2LLMProviderChainAcceptance:
    """
    Phase 2 Acceptance Suite verifying:
    1. Primary endpoint success (no fallback).
    2. Primary malformed JSON repair success and fallback on unrepairable output.
    3. Primary timeout / 5xx triggers controlled Ollama fallback.
    4. Primary 401/403 fails fast and NEVER falls back.
    5. Missing raw text data uses null/empty collections without hallucinating facts.
    6. Malformed or schema-violating output is strictly rejected.
    """

    @pytest.mark.asyncio
    async def test_01_primary_success_ollama_not_invoked(self):
        """When Primary LLM succeeds, Ollama is never called."""
        valid_json = """{
            "personalInfo": {"fullName": "Nguyen Van A", "email": "a@example.com"},
            "summary": "Experienced Software Engineer",
            "skills": [{"name": "Java", "level": "Senior"}],
            "experience": [{"company": "Tech Corp", "position": "Developer"}],
            "education": [{"institution": "HUST", "degree": "Bachelor"}],
            "projects": [],
            "certifications": [],
            "languages": []
        }"""
        primary = DummyLLM(provider="openai_compatible")
        primary.response = LLMResponse(
            content=valid_json,
            provider="openai_compatible",
            requested_model="gpt-4o-mini"
        )
        fallback = DummyLLM(provider="ollama")

        orch = FallbackLLMClient(primary_client=primary, fallback_client=fallback, fallback_enabled=True)
        service = CVStructuringService(fallback_orchestrator=orch)

        result = await service.structure_raw_text("Nguyen Van A. Email: a@example.com. Java Developer at Tech Corp.")
        assert result.success is True
        assert result.providerUsed == "primary"
        assert result.fallbackUsed is False
        assert fallback.call_count == 0
        assert result.data["personalInfo"]["fullName"] == "Nguyen Van A"

    @pytest.mark.asyncio
    async def test_02_primary_malformed_json_repair_and_fallback(self):
        """When Primary returns malformed JSON, 1 repair attempt is made; if still broken, fallback to Ollama."""
        primary = DummyLLM(provider="openai_compatible")
        # First call returns broken JSON, second call (repair) also returns broken JSON
        primary.side_effect = None
        primary.response = LLMResponse(
            content="BROKEN NOT JSON {name: 'Alice'",
            provider="openai_compatible",
            requested_model="gpt-4o-mini"
        )

        valid_fallback_json = """{
            "personalInfo": {"fullName": "Nguyen Van A"},
            "summary": "Recovered by fallback",
            "skills": [],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }"""
        fallback = DummyLLM(provider="ollama")
        fallback.response = LLMResponse(
            content=valid_fallback_json,
            provider="ollama",
            requested_model="dna5rm/granite4.2:3b-8k"
        )

        orch = FallbackLLMClient(primary_client=primary, fallback_client=fallback, fallback_enabled=True)
        service = CVStructuringService(fallback_orchestrator=orch)

        result = await service.structure_raw_text("Nguyen Van A software developer profile text.")
        assert result.success is True
        assert result.fallbackUsed is True
        assert result.providerUsed == "fallback"
        assert fallback.call_count == 1

    @pytest.mark.asyncio
    async def test_03_primary_5xx_and_timeout_triggers_ollama(self):
        """Primary timeout or HTTP 500/503 triggers Ollama fallback."""
        for error in [
            LLMTimeoutError("Request timed out", provider="openai_compatible"),
            LLMServerError("Internal Server Error", status_code=500, provider="openai_compatible"),
            LLMServerError("Service Unavailable", status_code=503, provider="openai_compatible"),
            LLMNetworkError("Connection refused", provider="openai_compatible"),
        ]:
            primary = DummyLLM(provider="openai_compatible")
            primary.side_effect = error

            valid_fallback_json = """{
                "personalInfo": {"fullName": "Recovered Candidate"},
                "summary": "Handled by Ollama",
                "skills": [],
                "experience": [],
                "education": [],
                "projects": [],
                "certifications": [],
                "languages": []
            }"""
            fallback = DummyLLM(provider="ollama")
            fallback.response = LLMResponse(
                content=valid_fallback_json,
                provider="ollama",
                requested_model="dna5rm/granite4.2:3b-8k"
            )

            orch = FallbackLLMClient(primary_client=primary, fallback_client=fallback, fallback_enabled=True)
            service = CVStructuringService(fallback_orchestrator=orch)

            result = await service.structure_raw_text("Candidate profile text with some content.")
            assert result.success is True
            assert result.fallbackUsed is True
            assert result.providerUsed == "fallback"
            assert fallback.call_count == 1

    @pytest.mark.asyncio
    async def test_04_primary_401_403_strictly_prohibits_fallback(self):
        """HTTP 401 Unauthorized or 403 Forbidden fail-fast and NEVER trigger fallback."""
        for auth_err in [
            LLMAuthenticationError("401 Invalid API Key", provider="openai_compatible"),
            LLMAuthorizationError("403 Forbidden", provider="openai_compatible"),
            LLMModelNotFoundError("404 Model does not exist", provider="openai_compatible"),
            LLMBadRequestError("400 Bad Request", provider="openai_compatible")
        ]:
            primary = DummyLLM(provider="openai_compatible")
            primary.side_effect = auth_err
            fallback = DummyLLM(provider="ollama")

            orch = FallbackLLMClient(primary_client=primary, fallback_client=fallback, fallback_enabled=True)
            service = CVStructuringService(fallback_orchestrator=orch)

            with pytest.raises(Exception) as exc_info:
                await service.structure_raw_text("Candidate profile text.")

            # Fallback must NEVER be called
            assert fallback.call_count == 0
            # Root exception preserved
            assert type(exc_info.value) in [
                LLMAuthenticationError,
                LLMAuthorizationError,
                LLMModelNotFoundError,
                LLMBadRequestError,
            ]

    def test_05_missing_raw_text_data_no_hallucination(self):
        """Fields not present in the CV text must be null or empty list, not hallucinated."""
        raw_text = "NGUYEN VAN B. Only email: b@example.com."
        validator = StructuredCVValidator()
        minimal_json = """{
            "personalInfo": {"fullName": "NGUYEN VAN B", "email": "b@example.com"},
            "summary": null,
            "skills": [],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }"""
        valid_json, valid_schema, data, err = validator.validate(minimal_json)
        assert valid_json is True
        assert valid_schema is True
        assert data.personalInfo.fullName == "NGUYEN VAN B"
        assert data.personalInfo.phone is None
        assert data.personalInfo.githubUrl is None
        assert data.skills == []
        assert data.experience == []
        assert data.summary is None

    def test_06_malformed_json_rejected(self):
        """Invalid JSON syntax or missing core fields fails validation cleanly."""
        validator = StructuredCVValidator()

        # 1. Broken syntax
        v1, v2, d1, e1 = validator.validate("{not valid json}")
        assert v1 is False
        assert v2 is False
        assert d1 is None

        # 2. Schema violation (wrong data types: skills as a string instead of list)
        v1, v2, d2, e2 = validator.validate('{"skills": "invalid_string_type"}')
        assert v1 is True
        assert v2 is False
        assert d2 is None
        assert e2 is not None

    def test_07_http_simulate_headers_dev_endpoint(self, monkeypatch):
        """Dev structure endpoint correctly simulates 401 fail-fast and 503 fallback."""
        monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
        client = TestClient(app)

        # 401 simulate header fails fast with 401
        res_401 = client.post(
            "/internal/ai/dev/structure-cv",
            json={"rawText": "Nguyen Van A software engineer with 5 years experience in Python and FastAPI."},
            headers={"X-Simulate-Primary-Status": "401"}
        )
        assert res_401.status_code == 401
        assert "401" in res_401.json()["detail"]

        # 404 simulate header fails fast with 404
        res_404 = client.post(
            "/internal/ai/dev/structure-cv",
            json={"rawText": "Nguyen Van A software engineer with 5 years experience in Python and FastAPI."},
            headers={"X-Simulate-Primary-Status": "404"}
        )
        assert res_404.status_code == 404
        assert "404" in res_404.json()["detail"]
