import os
import sys
from fastapi.testclient import TestClient
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health_check_endpoint_reports_up_only_when_ocr_and_llm_are_ready(monkeypatch):
    from app.api import endpoints

    monkeypatch.setattr(endpoints.tesseract_runtime, "get_health", lambda: {"status": "READY"})
    monkeypatch.setattr(endpoints, "get_llm_providers_health", lambda: {
        "primary": {"reachable": True},
        "fallback": {"reachable": False},
    })
    response = client.get("/internal/ai/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"
    assert response.json()["ocr"]["status"] == "READY"


def test_health_check_endpoint_is_degraded_when_ocr_is_misconfigured(monkeypatch):
    from app.api import endpoints

    monkeypatch.setattr(endpoints.tesseract_runtime, "get_health", lambda: {"status": "MISCONFIGURED"})
    monkeypatch.setattr(endpoints, "get_llm_providers_health", lambda: {
        "primary": {"reachable": True},
        "fallback": {"reachable": True},
    })
    response = client.get("/internal/ai/health")
    assert response.status_code == 200
    assert response.json()["status"] == "DEGRADED"


def test_health_check_endpoint_is_degraded_when_no_llm_provider_is_reachable(monkeypatch):
    from app.api import endpoints

    monkeypatch.setattr(endpoints.tesseract_runtime, "get_health", lambda: {"status": "READY"})
    monkeypatch.setattr(endpoints, "get_llm_providers_health", lambda: {
        "primary": {"reachable": False},
        "fallback": {"reachable": False},
    })
    response = client.get("/internal/ai/health")
    assert response.status_code == 200
    assert response.json()["status"] == "DEGRADED"

def test_extract_jd_endpoint():
    payload = {
        "job_id": "job-101",
        "title": "Java Spring Developer",
        "industry": "Technology",
        "raw_description": "Required: Java, Spring Boot, PostgreSQL. Preferred: Docker."
    }
    response = client.post("/internal/ai/extract-jd", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job-101"
    assert data["status"] == "SUCCESS"
    assert len(data["required_skills"]) > 0

def test_extract_cv_endpoint():
    payload = {
        "cv_id": "cv-201",
        "cv_version_id": "cv-ver-201",
        "file_type": "PDF",
        "raw_text": "Nguyen Van Candidate. Skills: Java, Spring Boot, PostgreSQL."
    }
    response = client.post("/internal/ai/extract-cv", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["cv_id"] == "cv-201"
    assert data["status"] == "SUCCESS"

def test_analyze_github_endpoint():
    from unittest.mock import patch
    from app.schemas.github import GitHubAnalyzeResponse
    mock_resp = GitHubAnalyzeResponse(
        candidate_id="cand-301",
        username="candidate-java",
        github_url="https://github.com/candidate-java",
        public_repos_count=1,
        activity_signal="HIGH",
        summary_notes="Mock notes",
        language_rank_summary="Java 100%",
        overall_supporting_rating="STRONG_SIGNAL",
        status="SYNCED"
    )
    with patch("app.api.endpoints.github_analyzer.analyze_candidate_github", return_value=mock_resp):
        payload = {
            "candidate_id": "cand-301",
            "github_url": "https://github.com/candidate-java"
        }
        response = client.post("/internal/ai/analyze-github", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["candidate_id"] == "cand-301"
        assert data["status"] == "SYNCED"
