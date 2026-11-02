"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.services.cv_structuring_service import CVStructuringService
from app.services.llm.types import LLMResponse
from app.services.llm.fallback_client import FallbackExecutionResult

def result(content, provider="primary"):
    return FallbackExecutionResult(response=LLMResponse(content=content, provider=provider,
        requested_model="synthetic-contract-model"), provider_used=provider,
        fallback_used=provider == "fallback", correlation_id="synthetic")


def test_sync_structuring_uses_raw_grounding_and_retains_provider_trace():
    orchestrator = SimpleNamespace(execute_sync=Mock(return_value=result('{"skills":[{"name":"Java"},{"name":"Kubernetes"}]}')))
    response = CVStructuringService(fallback_orchestrator=orchestrator).structure_raw_text_sync("Java backend developer. No other technical skills listed.")
    assert response.success
    assert [skill["name"] for skill in response.data["skills"]] == ["Java"]
    assert response.data["warnings"]
    assert response.providerUsed == "primary"
