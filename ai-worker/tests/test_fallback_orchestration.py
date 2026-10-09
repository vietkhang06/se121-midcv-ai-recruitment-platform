import pytest
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
from app.services.structured_cv_validator import StructuredCVValidator, StructuredCVData
from app.services.cv_structuring_service import CVStructuringService


class DummyLLMClient:
    def __init__(self, provider: str = "mock"):
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


class TestFallbackLLMClient:
    @pytest.mark.asyncio
    async def test_primary_success_ollama_not_called(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.response = LLMResponse(
            content='{"personalInfo": {"fullName": "Alice"}}',
            provider="openai_compatible",
            requested_model="gpt-4o-mini"
        )
        fallback = DummyLLMClient(provider="ollama")

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        res = await orchestrator.execute([{"role": "user", "content": "test"}])
        assert res.provider_used == "primary"
        assert res.fallback_used is False
        assert res.fallback_reason is None
        assert primary.call_count == 1
        assert fallback.call_count == 0

    @pytest.mark.asyncio
    async def test_primary_timeout_triggers_ollama_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMTimeoutError("Request timed out after 180s")
        fallback = DummyLLMClient(provider="ollama")
        fallback.response = LLMResponse(
            content='{"personalInfo": {"fullName": "Bob"}}',
            provider="ollama",
            requested_model="dna5rm/granite4.2:3b-8k"
        )

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        res = await orchestrator.execute([{"role": "user", "content": "test"}])
        assert res.provider_used == "fallback"
        assert res.fallback_used is True
        assert "time" in res.fallback_reason.lower()
        assert primary.call_count == 1
        assert fallback.call_count == 1

    @pytest.mark.asyncio
    async def test_primary_429_triggers_ollama_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMRateLimitError("HTTP 429: Rate limit exceeded")
        fallback = DummyLLMClient(provider="ollama")
        fallback.response = LLMResponse(
            content='{"personalInfo": {"fullName": "Carol"}}',
            provider="ollama",
            requested_model="dna5rm/granite4.2:3b-8k"
        )

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        res = await orchestrator.execute([{"role": "user", "content": "test"}])
        assert res.provider_used == "fallback"
        assert res.fallback_used is True
        assert primary.call_count == 1
        assert fallback.call_count == 1

    @pytest.mark.asyncio
    async def test_primary_503_triggers_ollama_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMServerError("HTTP 503: Service Unavailable", status_code=503)
        fallback = DummyLLMClient(provider="ollama")
        fallback.response = LLMResponse(
            content='{"personalInfo": {"fullName": "Dan"}}',
            provider="ollama",
            requested_model="dna5rm/granite4.2:3b-8k"
        )

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        res = await orchestrator.execute([{"role": "user", "content": "test"}])
        assert res.provider_used == "fallback"
        assert res.fallback_used is True
        assert primary.call_count == 1
        assert fallback.call_count == 1

    @pytest.mark.asyncio
    async def test_primary_401_auth_error_strictly_forbids_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMAuthenticationError("HTTP 401: Invalid API key")
        fallback = DummyLLMClient(provider="ollama")

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        with pytest.raises(LLMAuthenticationError):
            await orchestrator.execute([{"role": "user", "content": "test"}])

        # Ollama must NEVER be called on auth failure
        assert primary.call_count == 1
        assert fallback.call_count == 0

    @pytest.mark.asyncio
    async def test_primary_403_forbidden_strictly_forbids_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMAuthorizationError("HTTP 403: Forbidden")
        fallback = DummyLLMClient(provider="ollama")

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        with pytest.raises(LLMAuthorizationError):
            await orchestrator.execute([{"role": "user", "content": "test"}])

        assert primary.call_count == 1
        assert fallback.call_count == 0

    @pytest.mark.asyncio
    async def test_primary_404_model_not_found_strictly_forbids_fallback(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMModelNotFoundError("HTTP 404: Model not found")
        fallback = DummyLLMClient(provider="ollama")

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        with pytest.raises(LLMModelNotFoundError):
            await orchestrator.execute([{"role": "user", "content": "test"}])

        assert primary.call_count == 1
        assert fallback.call_count == 0

    @pytest.mark.asyncio
    async def test_all_providers_fail_raises_composite_error(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.side_effect = LLMServerError("Primary 500 error", status_code=500)
        fallback = DummyLLMClient(provider="ollama")
        fallback.side_effect = LLMNetworkError("Ollama connection refused")

        orchestrator = FallbackLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            fallback_enabled=True
        )

        with pytest.raises(LLMServerError) as exc_info:
            await orchestrator.execute([{"role": "user", "content": "test"}], correlation_id="cid-test-123")

        err_msg = str(exc_info.value)
        assert "All configured LLM providers failed" in err_msg
        assert "Primary" in err_msg
        assert "Fallback" in err_msg
        assert primary.call_count == 1
        assert fallback.call_count == 1


class TestStructuredCVValidator:
    def test_valid_json_parses_and_validates(self):
        validator = StructuredCVValidator()
        raw = """{
            "personalInfo": {"fullName": "Nguyen Van A", "email": "a@example.com"},
            "summary": "Experienced engineer",
            "skills": [{"name": "Python", "level": "Expert"}],
            "education": [],
            "experience": [],
            "projects": [],
            "certifications": [],
            "languages": []
        }"""
        j_val, s_val, data, err = validator.validate(raw)
        assert j_val is True
        assert s_val is True
        assert data.personalInfo.fullName == "Nguyen Van A"
        assert data.skills[0].name == "Python"
        assert err is None

    def test_valid_json_wrapped_in_code_fences(self):
        validator = StructuredCVValidator()
        raw = "```json\n{\"personalInfo\": {\"fullName\": \"Tran B\"}}\n```"
        j_val, s_val, data, err = validator.validate(raw)
        assert j_val is True
        assert s_val is True
        assert data.personalInfo.fullName == "Tran B"

    def test_malformed_json_syntax_detected(self):
        validator = StructuredCVValidator()
        raw = "{\"personalInfo\": {\"fullName\": \"Unclosed string"
        j_val, s_val, data, err = validator.validate(raw)
        assert j_val is False
        assert s_val is False
        assert data is None
        assert "syntax error" in err.lower()

    def test_invalid_data_types_detected(self):
        validator = StructuredCVValidator()
        # skills must be list of objects, not string
        raw = "{\"personalInfo\": {}, \"skills\": \"Python, Java\"}"
        j_val, s_val, data, err = validator.validate(raw)
        assert j_val is True
        assert s_val is False
        assert data is None
        assert "schema validation error" in err.lower()


class TestCVStructuringServiceAndDevEndpoint:
    @pytest.mark.asyncio
    async def test_structuring_service_successful_flow(self):
        primary = DummyLLMClient(provider="openai_compatible")
        primary.response = LLMResponse(
            content='''{
                "personalInfo": {"fullName": "Le Minh C", "email": "c@example.com"},
                "summary": "Full Stack Dev",
                "skills": [{"name": "React"}, {"name": "Node.js"}],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
                "languages": []
            }''',
            provider="openai_compatible",
            requested_model="gpt-4o-mini",
            prompt_tokens=100,
            completion_tokens=50,
            total_tokens=150
        )
        orchestrator = FallbackLLMClient(primary_client=primary, fallback_client=None, fallback_enabled=False)
        service = CVStructuringService(fallback_orchestrator=orchestrator)

        raw_cv = "Le Minh C - Full Stack Dev - Email: c@example.com - Skills: React, Node.js"
        res = await service.structure_raw_text(raw_cv)

        assert res.success is True
        assert res.providerUsed == "primary"
        assert res.fallbackUsed is False
        assert res.validation["jsonValid"] is True
        assert res.validation["schemaValid"] is True
        assert res.data["personalInfo"]["fullName"] == "Le Minh C"
        assert res.usage["totalTokens"] == 150

    @pytest.mark.asyncio
    async def test_repair_request_succeeds_on_initial_malformed_json(self):
        primary = DummyLLMClient(provider="openai_compatible")
        # First call produces broken JSON; repair call produces valid JSON
        responses = [
            LLMResponse(content='{"personalInfo": {"fullName": "Repaired Candidate", broken', provider="openai_compatible", requested_model="gpt-4o-mini"),
            LLMResponse(content='{"personalInfo": {"fullName": "Repaired Candidate"}, "skills": [], "education": [], "experience": [], "projects": [], "certifications": [], "languages": []}', provider="openai_compatible", requested_model="gpt-4o-mini")
        ]
        curr_idx = 0

        async def mock_chat(messages, correlation_id=None):
            nonlocal curr_idx
            resp = responses[curr_idx]
            curr_idx += 1
            return resp

        primary.chat = mock_chat
        orchestrator = FallbackLLMClient(primary_client=primary, fallback_client=None, fallback_enabled=False)
        service = CVStructuringService(fallback_orchestrator=orchestrator)

        res = await service.structure_raw_text("Sample CV text for repair test with sufficient length.")
        assert res.success is True
        assert res.data["personalInfo"]["fullName"] == "Repaired Candidate"
        # Total attempts: 1 initial + 1 repair = 2
        assert curr_idx == 2

    def test_dev_structure_endpoint_disabled_by_default(self, monkeypatch):
        monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", False)
        client = TestClient(app)
        res = client.post("/internal/ai/dev/structure-cv", json={"rawText": "Valid CV text content"})
        assert res.status_code == 404

    def test_dev_structure_endpoint_rejects_empty_raw_text(self, monkeypatch):
        monkeypatch.setattr(settings, "ENABLE_DEV_AI_TEST_ENDPOINTS", True)
        client = TestClient(app)
        res = client.post("/internal/ai/dev/structure-cv", json={"rawText": "   "})
        assert res.status_code == 400

    def test_dual_alias_canonical_schema_compatibility(self):
        validator = StructuredCVValidator()
        snake_case_json = """{
            "personal_info": {
                "full_name": "Tran Thi B",
                "email": "b@example.com",
                "phone": "+84912345678",
                "location": "Da Nang, Vietnam",
                "linkedin_url": "https://linkedin.com/in/ttb",
                "github_url": "https://github.com/ttb"
            },
            "summary": "Senior Software Architect",
            "skills": [{"name": "Go", "level": "Expert"}, {"skill_name": "Docker"}],
            "education": [{
                "institution": "Danang University",
                "degree": "Bachelor of Engineering",
                "field_of_study": "Information Technology",
                "start_year": 2018,
                "end_year": 2022,
                "gpa": 3.8,
                "gpa_scale": 4.0,
                "gpa_display": "3.8/4.0"
            }],
            "experience": [{
                "company_name": "Tech Corp",
                "role": "Team Lead",
                "start_date": "2022",
                "end_date": "2024",
                "is_current": false,
                "description": "Led backend microservices",
                "tech_stack": ["Go", "Kubernetes"]
            }],
            "projects": [{
                "name": "Cloud Gate",
                "role": "Lead Architect",
                "description": "API Gateway",
                "tech_stack": ["Go", "gRPC"]
            }],
            "certifications": [{"name": "AWS SAA", "issuer": "AWS", "date": "2023"}],
            "languages": [{"language": "English", "proficiency": "Fluent"}]
        }"""
        j_val, s_val, data, err = validator.validate(snake_case_json)
        assert j_val is True
        assert s_val is True
        assert err is None
        assert data.personalInfo.fullName == "Tran Thi B"
        assert data.personalInfo.address == "Da Nang, Vietnam"
        assert data.skills[1].name == "Docker"
        assert data.education[0].fieldOfStudy == "Information Technology"
        assert data.education[0].gpa == 3.8
        assert data.education[0].gpa_scale == 4.0
        assert data.education[0].gpa_display == "3.8/4.0"
        assert data.experience[0].company == "Tech Corp"
        assert data.experience[0].position == "Team Lead"
        assert data.experience[0].technologies == ["Go", "Kubernetes"]
        assert data.projects[0].techStack == ["Go", "gRPC"]

    @pytest.mark.asyncio
    async def test_schema_type_mismatch_triggers_repair_and_succeeds(self):
        primary = DummyLLMClient(provider="openai_compatible")
        responses = [
            LLMResponse(
                content='{"personalInfo": {"fullName": "Candidate Schema Test"}, "skills": "invalid_string_not_list"}',
                provider="openai_compatible",
                requested_model="gpt-4o-mini"
            ),
            LLMResponse(
                content='{"personalInfo": {"fullName": "Candidate Schema Test"}, "skills": [{"name": "Python"}], "education": [], "experience": [], "projects": [], "certifications": [], "languages": []}',
                provider="openai_compatible",
                requested_model="gpt-4o-mini"
            )
        ]
        curr_idx = 0

        async def mock_chat(messages, correlation_id=None):
            nonlocal curr_idx
            resp = responses[curr_idx]
            curr_idx += 1
            return resp

        primary.chat = mock_chat
        orchestrator = FallbackLLMClient(primary_client=primary, fallback_client=None, fallback_enabled=False)
        service = CVStructuringService(fallback_orchestrator=orchestrator)

        res = await service.structure_raw_text("Candidate profile text with sufficient length for structuring test.")
        assert res.success is True
        assert res.validation["schemaValid"] is True
        assert res.data["personalInfo"]["fullName"] == "Candidate Schema Test"
        assert res.data["skills"][0]["name"] == "Python"
        assert curr_idx == 2

    @pytest.mark.asyncio
    async def test_bounded_retry_exhaustion_returns_terminal_failure(self):
        primary = DummyLLMClient(provider="openai_compatible")
        # Both initial and repair calls fail schema validation
        responses = [
            LLMResponse(
                content='{"personalInfo": {"fullName": "Candidate Fail"}, "skills": "still_not_a_list"}',
                provider="openai_compatible",
                requested_model="gpt-4o-mini"
            ),
            LLMResponse(
                content='{"personalInfo": {"fullName": "Candidate Fail"}, "skills": 12345}',
                provider="openai_compatible",
                requested_model="gpt-4o-mini"
            )
        ]
        curr_idx = 0

        async def mock_chat(messages, correlation_id=None):
            nonlocal curr_idx
            resp = responses[curr_idx]
            curr_idx += 1
            return resp

        primary.chat = mock_chat
        orchestrator = FallbackLLMClient(primary_client=primary, fallback_client=None, fallback_enabled=False)
        service = CVStructuringService(fallback_orchestrator=orchestrator)

        res = await service.structure_raw_text("Candidate profile text with sufficient length for exhaustion test.")
        assert res.success is False
        assert res.error == "LLM_SCHEMA_VALIDATION_FAILED"
        assert res.data is None
        assert res.validation["schemaValid"] is False
        # Must be strictly bounded to max 2 attempts (1 initial + 1 repair)
        assert curr_idx == 2

    def test_sanitize_validation_error_redacts_sensitive_data(self):
        from app.services.cv_structuring_service import _sanitize_validation_error
        raw_error = (
            "Validation error for email candidate.secret@domain.com and phone +84987654321 with "
            "token sk-abcdef1234567890abcdef123456 and bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc"
        )
        sanitized = _sanitize_validation_error(raw_error)
        assert "candidate.secret@domain.com" not in sanitized
        assert "[REDACTED_EMAIL]" in sanitized
        assert "+84987654321" not in sanitized
        assert "[REDACTED_PHONE]" in sanitized
        assert "sk-abcdef1234567890abcdef123456" not in sanitized
        assert "[REDACTED_SECRET]" in sanitized
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc" not in sanitized

