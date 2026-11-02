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
