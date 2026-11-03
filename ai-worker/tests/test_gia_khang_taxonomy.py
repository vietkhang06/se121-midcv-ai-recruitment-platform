"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.services.taxonomy_normalizer import TaxonomyNormalizer, TAXONOMY_CATALOG

@pytest.mark.parametrize("raw", ["C", "C++", "C##", "React Native", "R", "Jav"])
def test_taxonomy_does_not_guess_confusable_short_tokens(raw):
    embedding = Mock(); embedding.embed_batch.side_effect = RuntimeError("offline")
    item = TaxonomyNormalizer(embedding_service=embedding)._normalize_single_skill(raw)
    assert item.match_type == "UNKNOWN"


def test_taxonomy_alias_fuzzy_and_real_vector_paths():
    normalizer = TaxonomyNormalizer(embedding_service=Mock())
    assert normalizer._normalize_single_skill("lập trình java").canonical_name == "Java"
    assert normalizer._normalize_single_skill("Kubernets").match_type == "FUZZY"
    target = next(i for i, row in enumerate(TAXONOMY_CATALOG) if row["canonical_name"] == "Docker")
    vector = lambda first, second: [first, second] + [0.0] * 1022
    batch = [vector(1, 0)] + [vector(1, 0) if i == target else vector(0, 1) for i in range(len(TAXONOMY_CATALOG))]
    normalizer.embedding_service.embed_batch.return_value = batch
    item = normalizer._normalize_single_skill("isolated packaging knowledge")
    assert item.match_type == "SEMANTIC" and item.canonical_name == "Docker"


def test_lexical_similarity_is_never_reported_as_vector_semantics():
    embed = Mock(); embed.embed_batch.side_effect = RuntimeError("unavailable")
    assert TaxonomyNormalizer(embedding_service=embed)._normalize_single_skill("Spring rocks").match_type != "SEMANTIC"


def test_llm_can_only_choose_from_vector_top_k_after_embedding():
    events = []
    embedding = Mock()
    target = next(i for i, row in enumerate(TAXONOMY_CATALOG) if row["canonical_name"] == "Docker")
    runner_up = next(i for i, row in enumerate(TAXONOMY_CATALOG) if row["canonical_name"] == "Kubernetes")
    vectors = [[1.0, 0.0]] + [[0.0, 1.0] for _ in TAXONOMY_CATALOG]
    vectors[target + 1] = [0.80, 0.60]
    vectors[runner_up + 1] = [0.78, 0.63]
    def embed_batch(_):
        events.append("embedding")
        return vectors
    embedding.embed_batch.side_effect = embed_batch
    llm = Mock(); llm.is_configured = True
    def chat_completion(**kwargs):
        events.append("llm")
        assert "SKILL_DEVOPS_DOCKER" in kwargs["user_prompt"]
        return SimpleNamespace(content="SKILL_DEVOPS_DOCKER")
    llm.chat_completion.side_effect = chat_completion
    item = TaxonomyNormalizer(llm_client=llm, embedding_service=embedding)._normalize_single_skill("container platform knowledge")
    assert events == ["embedding", "llm"]
    assert item.canonical_id == "SKILL_DEVOPS_DOCKER" and item.match_type == "LLM_DISAMBIGUATION"
