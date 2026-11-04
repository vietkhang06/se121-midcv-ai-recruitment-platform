"""Local concept fallback must not imply technical equivalence of distinct stacks.

These are deterministic unit tests (NOT live embedding-provider/Pgvector acceptance).
"""
from app.services.semantic_matching_service import SemanticMatchingService


def test_distinct_programming_languages_have_distinct_concepts():
    map_concept = SemanticMatchingService._map_to_concept
    assert map_concept("java") != map_concept("javascript")
    assert map_concept("springboot") != map_concept("springframework")
    assert map_concept("mysql") != map_concept("postgresql")


def test_local_concept_cosine_does_not_equate_java_and_javascript():
    service = SemanticMatchingService()
    assert service._compute_concept_cosine("java", "javascript") == 0.0
    assert service._compute_concept_cosine("springboot", "springframework") == 0.0
    assert service._compute_concept_cosine("mysql", "postgresql") == 0.0
