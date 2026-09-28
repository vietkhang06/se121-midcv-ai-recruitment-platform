import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.roadmap import SkillGapAnalysisRequest
from app.services.skill_gap_service import SkillGapService
from app.services.taxonomy_normalizer import TaxonomyNormalizer


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def gap_service():
    normalizer = TaxonomyNormalizer()
    return SkillGapService(normalizer=normalizer)


class TestPhase8SkillGapRoadmapAcceptance:
    """
    Acceptance Test Suite for Phase 8: Skill Gap Breakdown & Tailored Roadmap Recommendations.
    Verifies AC-P8-01, AC-P8-02, and AC-P8-03.
    """

    def test_5_category_gap_classification(self, gap_service):
        """
        AC-P8-01: 5-Category Gap Classification.
        Verifies MET, MISSING_MANDATORY, MISSING_PREFERRED, RELATED_TO_LEARN, and EVIDENCE_MISSING.
        """
        req = SkillGapAnalysisRequest(
            candidate_skills=["Java", "Spring Boot", "Docker"],
            candidate_verified_skills=["Java"],  # Spring Boot is claimed but unverified
            jd_required_skills=["Java", "Spring Boot", "PostgreSQL"],  # Postgres is missing mandatory
            jd_preferred_skills=["Kubernetes", "Kafka"],  # Kubernetes, Kafka are missing preferred
            target_job_title="Senior Backend Engineer"
        )
        res = gap_service.analyze_gap_and_generate_roadmap(req)

        categories = {item.skill_name: item.category for item in res.gap_breakdown}

        # 1. Java is claimed and verified -> MET
        assert categories.get("Java") == "MET"
        # 2. Spring Boot is claimed but not in verified -> EVIDENCE_MISSING
        assert categories.get("Spring Boot") == "EVIDENCE_MISSING"
        # 3. PostgreSQL is required but candidate doesn't have it -> MISSING_MANDATORY
        assert categories.get("PostgreSQL") == "MISSING_MANDATORY"
        # 4. Kubernetes and Kafka are preferred and candidate doesn't have them -> MISSING_PREFERRED
        assert categories.get("Kubernetes") == "MISSING_PREFERRED"
        assert categories.get("Apache Kafka") == "MISSING_PREFERRED" or categories.get("Kafka") == "MISSING_PREFERRED"
        # 5. At least one related expansion skill -> RELATED_TO_LEARN
        assert any(item.category == "RELATED_TO_LEARN" for item in res.gap_breakdown)

        assert res.met_count >= 1
        assert res.missing_mandatory_count >= 1
        assert res.missing_preferred_count >= 1
        assert res.evidence_missing_count >= 1

    def test_anti_auto_injection_rule(self, gap_service):
        """
        AC-P8-02: No Auto-Injection into Profile.
        Candidate's profile skills must NOT be modified or expanded automatically.
        """
        original_skills = ["Java", "Docker"]
        candidate_skills_copy = list(original_skills)

        req = SkillGapAnalysisRequest(
            candidate_skills=candidate_skills_copy,
            candidate_verified_skills=["Java"],
            jd_required_skills=["Java", "PostgreSQL", "Kafka"],
            jd_preferred_skills=["Redis"],
            target_job_title="Backend Developer"
        )
        res = gap_service.analyze_gap_and_generate_roadmap(req)

        # 1. Candidate's original skills list was not mutated
        assert candidate_skills_copy == original_skills
        assert "PostgreSQL" not in candidate_skills_copy
        assert "Kafka" not in candidate_skills_copy

        # 2. Explicit disclaimer is present
        assert "does NOT automatically modify" in res.disclaimer

    def test_tailored_roadmap_generation(self, gap_service):
        """
        AC-P8-03: Tailored Roadmap Generation.
        Generates realistic milestones targeting missing skills with objectives and practice projects.
        """
        req = SkillGapAnalysisRequest(
            candidate_skills=["Java"],
            candidate_verified_skills=["Java"],
            jd_required_skills=["Java", "PostgreSQL"],
            jd_preferred_skills=["Kafka"],
            target_job_title="Mid-level Java Engineer"
        )
        res = gap_service.analyze_gap_and_generate_roadmap(req)

        assert len(res.tailored_roadmap) == 3

        m1 = res.tailored_roadmap[0]
        assert m1.milestone_number == 1
        assert m1.estimated_weeks > 0
        assert len(m1.learning_objectives) >= 2
        assert len(m1.practice_project) > 20

        # Missing skills (PostgreSQL or Kafka) should be targeted
        all_milestone_skills = [s for m in res.tailored_roadmap for s in m.target_skills]
        assert any("PostgreSQL" in s for s in all_milestone_skills)

    def test_api_endpoint_skill_gap_and_roadmap_contract(self, client):
        """
        Contract verification for POST /internal/ai/matching/skill-gap-and-roadmap.
        """
        payload = {
            "candidate_skills": ["Java", "Docker"],
            "candidate_verified_skills": ["Java"],
            "jd_required_skills": ["Java", "Spring Boot"],
            "jd_preferred_skills": ["Kubernetes"],
            "target_job_title": "Java Cloud Developer"
        }
        resp = client.post("/internal/ai/matching/skill-gap-and-roadmap", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert "gap_breakdown" in data
        assert "met_count" in data
        assert "missing_mandatory_count" in data
        assert "tailored_roadmap" in data
        assert len(data["tailored_roadmap"]) >= 1
