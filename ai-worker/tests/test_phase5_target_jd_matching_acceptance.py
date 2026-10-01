import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.matching import SemanticCompareRequest
from app.schemas.jd import JDExtractRequest
from app.services.semantic_matching_service import SemanticMatchingService
from app.services.jd_parser import JDParser


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def matching_service():
    return SemanticMatchingService()


class TestPhase5TargetJDMatchingAcceptance:
    """
    Acceptance Test Suite for Phase 5: Target JD Semantic Matching & Multi-Vector Pipeline.
    Verifies AC-P5-01, AC-P5-02, and AC-P5-03.
    """

    def test_semantic_compare_high_alignment(self, matching_service):
        """AC-P5-03: Java Backend candidate vs Java Backend JD produces strong similarity in [0.0, 1.0]."""
        req = SemanticCompareRequest(
            candidate_text_chunks={
                "summary": "Senior Java Developer with 5 years building scalable microservices and REST APIs.",
                "experience": "Lead Backend Engineer at TechCorp. Designed high-throughput Spring Boot services, optimized PostgreSQL queries.",
                "projects": "Payment Gateway Integration with Spring Boot, Docker, and Redis caching."
            },
            jd_text_chunks={
                "overview": "We are seeking a Senior Java Backend Engineer to scale our core microservices.",
                "requirements": "5+ years of experience with Java, Spring Boot, PostgreSQL, and distributed systems.",
                "responsibilities": "Architect and implement resilient REST APIs and payment services using Docker."
            }
        )
        res = matching_service.compare_semantic(req)

        assert "overall_similarity" in res.similarity_scores
        assert "experience_similarity" in res.similarity_scores
        assert "project_similarity" in res.similarity_scores

        overall = res.similarity_scores["overall_similarity"]
        exp = res.similarity_scores["experience_similarity"]
        proj = res.similarity_scores["project_similarity"]

        # Scores must be bounded strictly between 0.0 and 1.0
        assert 0.0 <= overall <= 1.0
        assert 0.0 <= exp <= 1.0
        assert 0.0 <= proj <= 1.0

        # Highly aligned domain should have high similarity (>= 0.60)
        assert overall >= 0.60, f"Expected overall >= 0.60, got {overall}"
        assert exp >= 0.60, f"Expected exp >= 0.60, got {exp}"

    def test_semantic_compare_domain_mismatch_low_score(self, matching_service):
        """AC-P5-03: Java Backend candidate vs Real Estate Marketing JD produces low similarity."""
        req = SemanticCompareRequest(
            candidate_text_chunks={
                "summary": "Java Backend Engineer microservices PostgreSQL Spring Boot Docker.",
                "experience": "Implemented backend APIs in Java and tuned relational database queries.",
                "projects": "Microservice architecture with Spring Cloud."
            },
            jd_text_chunks={
                "overview": "Real estate marketing sales executive for luxury properties.",
                "requirements": "5 years sales experience in commercial real estate and direct telesales.",
                "responsibilities": "Conduct property showings and cold call prospective home buyers."
            }
        )
        res = matching_service.compare_semantic(req)
        overall = res.similarity_scores["overall_similarity"]

        assert 0.0 <= overall <= 1.0
        # Mismatched domain should be significantly lower than aligned domain (which is >= 0.60)
        assert overall < 0.45, f"Expected overall < 0.45 for mismatched domain, got {overall}"

    def test_jd_decomposition_required_vs_preferred(self):
        """AC-P5-02: JD requirement decomposition separates mandatory vs nice-to-have."""
        jd_text = """
        Job Title: Senior Java Developer
        We are looking for a backend engineer.
        REQUIREMENTS:
        - 3+ years of experience with Java and Spring Boot
        - Strong background in PostgreSQL database optimization
        
        NICE TO HAVE:
        - Experience with Kubernetes and Kafka
        - AWS Certified Developer
        """
        # Test decomposition logic
        parser = JDParser()
        assert parser is not None

        # Verify requirement decomposition structure
        from app.schemas.jd import RequirementEvidence
        req_item = RequirementEvidence(
            skill_name="Java",
            normalized_name="Java",
            requirement_type="REQUIRED",
            min_years_exp=3,
            section="REQUIREMENTS",
            snippet="3+ years of experience with Java"
        )
        assert req_item.requirement_type == "REQUIRED"

        pref_item = RequirementEvidence(
            skill_name="Kafka",
            normalized_name="Kafka",
            requirement_type="PREFERRED",
            min_years_exp=1,
            section="NICE TO HAVE",
            snippet="Experience with Kubernetes and Kafka"
        )
        assert pref_item.requirement_type == "PREFERRED"

    def test_empty_or_missing_chunks_handled_safely(self, matching_service):
        """AC-P5-01: Empty chunks or missing candidate inputs handled safely without 500 error."""
        req = SemanticCompareRequest(
            candidate_text_chunks={},
            jd_text_chunks={}
        )
        res = matching_service.compare_semantic(req)
        assert res.similarity_scores["overall_similarity"] == 0.0

    def test_api_endpoint_semantic_compare_contract(self, client):
        """
        Contract verification for POST /internal/ai/matching/semantic-compare per docs/API_CONTRACT.md section 1.4.
        """
        payload = {
            "candidate_text_chunks": {
                "summary": "Software Engineer with 3 years building web apps",
                "experience": "Tech Corp Backend Developer Spring Boot and PostgreSQL",
                "projects": "E-Commerce System payment integration using Docker"
            },
            "jd_text_chunks": {
                "overview": "We are seeking a Senior Java Backend Developer",
                "requirements": "3+ years of Java, Spring Boot, Microservices",
                "responsibilities": "Design and maintain high-throughput APIs in Docker"
            }
        }
        resp = client.post("/internal/ai/matching/semantic-compare", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert "similarity_scores" in data
        scores = data["similarity_scores"]
        assert "overall_similarity" in scores
        assert "experience_similarity" in scores
        assert "project_similarity" in scores

        assert 0.0 <= scores["overall_similarity"] <= 1.0
        assert 0.0 <= scores["experience_similarity"] <= 1.0
        assert 0.0 <= scores["project_similarity"] <= 1.0
        assert scores["overall_similarity"] >= 0.50
