import time
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.taxonomy import SkillNormalizeRequest
from app.services.taxonomy_normalizer import TaxonomyNormalizer
from app.services.llm.types import LLMResponse


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def normalizer():
    return TaxonomyNormalizer(llm_client=None)


class TestPhase4TaxonomyNormalizationAcceptance:
    """
    Acceptance Test Suite for Phase 4: Skills & Occupations Taxonomy Normalization Engine.
    Verifies AC-P4-01, AC-P4-02, and AC-P4-03.
    """

    def test_layer1_exact_match(self, normalizer):
        """AC-P4-01 Layer 1: Exact Match yields 1.0 confidence and EXACT match_type."""
        req = SkillNormalizeRequest(skills=["Java", "Spring Boot", "Python", "Docker"])
        res = normalizer.normalize_skills(req)

        assert len(res.normalized_skills) == 4
        
        java = next(s for s in res.normalized_skills if s.raw_name == "Java")
        assert java.canonical_id == "SKILL_PROG_JAVA"
        assert java.canonical_name == "Java"
        assert java.match_type == "EXACT"
        assert java.confidence == 1.0
        assert java.category == "BACKEND"

        spring = next(s for s in res.normalized_skills if s.raw_name == "Spring Boot")
        assert spring.canonical_id == "SKILL_JAVA_SPRING_BOOT"
        assert spring.match_type == "EXACT"
        assert spring.confidence == 1.0

    def test_layer2_alias_lookup_multilingual(self, normalizer):
        """AC-P4-01 Layer 2: Alias Lookup for Vietnamese and English variations."""
        req = SkillNormalizeRequest(skills=[
            "reactjs", 
            "lập trình java", 
            "k8s", 
            "containerization",
            "postgres"
        ])
        res = normalizer.normalize_skills(req)

        assert len(res.normalized_skills) == 5

        react = next(s for s in res.normalized_skills if s.raw_name == "reactjs")
        assert react.canonical_id == "SKILL_FRONTEND_REACT"
        assert react.canonical_name == "React.js"
        assert react.match_type == "ALIAS"
        assert react.confidence >= 0.95

        java_vn = next(s for s in res.normalized_skills if s.raw_name == "lập trình java")
        assert java_vn.canonical_id == "SKILL_PROG_JAVA"
        assert java_vn.canonical_name == "Java"
        assert java_vn.match_type == "ALIAS"

        k8s = next(s for s in res.normalized_skills if s.raw_name == "k8s")
        assert k8s.canonical_id == "SKILL_DEVOPS_KUBERNETES"
        assert k8s.canonical_name == "Kubernetes"
        assert k8s.match_type == "ALIAS"

        docker_alias = next(s for s in res.normalized_skills if s.raw_name == "containerization")
        assert docker_alias.canonical_id == "SKILL_DEVOPS_DOCKER"
        assert docker_alias.canonical_name == "Docker"
        assert docker_alias.match_type == "ALIAS"

        pg = next(s for s in res.normalized_skills if s.raw_name == "postgres")
        assert pg.canonical_id == "SKILL_DATABASE_POSTGRESQL"
        assert pg.canonical_name == "PostgreSQL"
        assert pg.match_type == "ALIAS"

    def test_layer3_fuzzy_matching_ratio_threshold(self, normalizer):
        """AC-P4-01 Layer 3: Fuzzy Match detects typos with Levenshtein ratio >= 0.85."""
        req = SkillNormalizeRequest(skills=["Sprng Boot", "PostgreSQ", "Kubernets"])
        res = normalizer.normalize_skills(req)

        spring_typo = next(s for s in res.normalized_skills if s.raw_name == "Sprng Boot")
        assert spring_typo.canonical_id == "SKILL_JAVA_SPRING_BOOT"
        assert spring_typo.canonical_name == "Spring Boot"
        assert spring_typo.match_type == "FUZZY"
        assert spring_typo.confidence >= 0.85

        pg_typo = next(s for s in res.normalized_skills if s.raw_name == "PostgreSQ")
        assert pg_typo.canonical_id == "SKILL_DATABASE_POSTGRESQL"
        assert pg_typo.canonical_name == "PostgreSQL"
        assert pg_typo.match_type == "FUZZY"
        assert pg_typo.confidence >= 0.85

        k8s_typo = next(s for s in res.normalized_skills if s.raw_name == "Kubernets")
        assert k8s_typo.canonical_id == "SKILL_DEVOPS_KUBERNETES"
        assert k8s_typo.canonical_name == "Kubernetes"
        assert k8s_typo.match_type == "FUZZY"
        assert k8s_typo.confidence >= 0.85

    def test_layer4_bounded_llm_disambiguation(self):
        """
        AC-P4-02: Bounded LLM Disambiguation.
        LLM receives Top-K (<= 5) candidate list and must select strictly from it.
        """
        mock_llm = MagicMock()
        mock_llm.is_configured = True
        mock_llm.chat_completion.return_value = LLMResponse(
            content="SKILL_DEVOPS_KUBERNETES",
            provider="openai_compatible",
            requested_model="gpt-4o-mini",
            prompt_tokens=50,
            completion_tokens=5,
            total_tokens=55,
            latency_ms=100
        )

        normalizer_with_llm = TaxonomyNormalizer(llm_client=mock_llm)

        # Ambiguous skill that doesn't exact-match or fuzzy-match cleanly
        req = SkillNormalizeRequest(
            skills=["container orch mesh"],
            context="Experienced in deploying microservices clusters on cloud"
        )
        res = normalizer_with_llm.normalize_skills(req)

        assert len(res.normalized_skills) == 1
        item = res.normalized_skills[0]
        assert item.canonical_id == "SKILL_DEVOPS_KUBERNETES"
        assert item.match_type == "LLM_DISAMBIGUATION"
        assert item.confidence == 0.88
        assert mock_llm.chat_completion.called

    def test_bounded_llm_disallows_invented_id(self):
        """
        AC-P4-02: Anti-fabrication check - If LLM invents an unlisted ID, it is discarded.
        """
        mock_llm = MagicMock()
        mock_llm.is_configured = True
        # LLM returns a hallucinated ID that does not exist in the candidate list
        mock_llm.chat_completion.return_value = LLMResponse(
            content="SKILL_FABRICATED_CLOUD_VOODOO",
            provider="openai_compatible",
            requested_model="gpt-4o-mini",
            prompt_tokens=50,
            completion_tokens=5,
            total_tokens=55,
            latency_ms=100
        )

        normalizer_with_llm = TaxonomyNormalizer(llm_client=mock_llm)
        req = SkillNormalizeRequest(skills=["unusual tech phrasing 12345"])
        res = normalizer_with_llm.normalize_skills(req)

        assert len(res.normalized_skills) == 1
        item = res.normalized_skills[0]
        # Must NOT take the fabricated ID; should fallback safely to UNKNOWN
        assert item.canonical_id != "SKILL_FABRICATED_CLOUD_VOODOO"
        assert item.match_type in ["UNKNOWN", "SEMANTIC"]

    def test_autocomplete_speed_and_accuracy(self, normalizer):
        """AC-P4-03: Autocomplete returns top suggestions in <= 200ms."""
        start_time = time.perf_counter()
        res = normalizer.autocomplete(query="Spr", limit=10)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # Latency must be far below 200ms
        assert elapsed_ms < 200.0, f"Autocomplete took {elapsed_ms:.2f}ms, expected <= 200ms"
        assert len(res.suggestions) > 0
        assert any(s.canonical_name == "Spring Boot" for s in res.suggestions)

        # Alias prefix autocomplete: "k8" -> Kubernetes
        alias_res = normalizer.autocomplete(query="k8", limit=10)
        assert any(s.canonical_name == "Kubernetes" for s in alias_res.suggestions)

    def test_api_endpoint_contract(self, client):
        """Contract verification for POST /internal/ai/taxonomy/normalize-skills."""
        payload = {
            "skills": ["Spring Boot", "reactjs", "lập trình java", "k8s"]
        }
        resp = client.post("/internal/ai/taxonomy/normalize-skills", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert "normalized_skills" in data
        items = data["normalized_skills"]
        assert len(items) == 4

        # Verify exact response contract per docs/API_CONTRACT.md section 1.3
        item0 = next(i for i in items if i["raw_name"] == "Spring Boot")
        assert item0["canonical_name"] == "Spring Boot"
        assert item0["match_type"] == "EXACT"
        assert item0["confidence"] == 1.0

        item1 = next(i for i in items if i["raw_name"] == "reactjs")
        assert item1["canonical_name"] == "React.js"
        assert item1["match_type"] == "ALIAS"

        item2 = next(i for i in items if i["raw_name"] == "lập trình java")
        assert item2["canonical_name"] == "Java"
        assert item2["match_type"] == "ALIAS"

        item3 = next(i for i in items if i["raw_name"] == "k8s")
        assert item3["canonical_name"] == "Kubernetes"
        assert item3["match_type"] == "ALIAS"

    def test_api_autocomplete_endpoint(self, client):
        """Contract verification for GET /internal/ai/taxonomy/autocomplete."""
        resp = client.get("/internal/ai/taxonomy/autocomplete?query=react&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "suggestions" in data
        assert any(s["canonical_name"] == "React.js" for s in data["suggestions"])
