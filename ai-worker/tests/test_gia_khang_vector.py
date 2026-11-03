"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.services.embedding_service import OllamaEmbeddingService, EmbeddingError
from app.services.semantic_matching_service import SemanticMatchingService

@pytest.mark.parametrize("vector", [[1.0] * 1023, [0.0] * 1024, [float("nan")] * 1024, [float("inf")] * 1024, [True] * 1024])
def test_embedding_rejects_invalid_vectors(vector):
    with pytest.raises(EmbeddingError):
        OllamaEmbeddingService.validate_vector(vector)


def test_semantic_fallback_reembeds_the_entire_pair_in_one_space(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "LLM_PRIMARY_ENABLED", True)
    monkeypatch.setattr(settings, "LLM_FALLBACK_ENABLED", True)
    service = SemanticMatchingService(primary_api_key="synthetic")
    service._embed_openai_compatible = Mock(side_effect=[[1.0, 0.0], RuntimeError("second request failed")])
    service._embed_ollama = Mock(side_effect=[[0.0, 1.0], [0.0, 1.0]])
    assert service.compute_similarity("text A", "text B") == 1.0
    assert [call.args[0] for call in service._embed_ollama.call_args_list] == ["text A", "text B"]
