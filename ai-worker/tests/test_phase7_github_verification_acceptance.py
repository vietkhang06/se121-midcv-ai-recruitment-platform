import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.github import GitHubAnalyzeRequest
from app.services.github_analyzer import GitHubAnalyzer
from app.services.github_client import GitHubClient


@pytest.fixture
def client():
    return TestClient(app)


class TestPhase7GitHubVerificationAcceptance:
    """
    Acceptance Test Suite for Phase 7: GitHub Verification & Objective Evidence Mining.
    Verifies AC-P7-01, AC-P7-02, AC-P7-03, and AC-P7-04.
    """

    def test_distinction_of_claim_vs_evidence(self):
        """
        AC-P7-01: Claim vs Evidence.
        Candidate claim (e.g. CV_EXTRACTED 'Python') is distinguished from objective GITHUB_VERIFIED evidence.
        """
        mock_gh = MagicMock(spec=GitHubClient)
        mock_gh.fetch_user_repositories.return_value = {
            "status": "SYNCED",
            "public_repos_count": 3,
            "latest_activity_at": "2026-09-15T10:00:00Z",
            "repositories": [
                {
                    "name": "fastapi-service",
                    "repo_url": "https://github.com/dev/fastapi-service",
                    "description": "Microservice",
                    "primary_language": "Python",
                    "stars_count": 0,  # Zero stars
                    "forks_count": 0,
                    "is_archived": False,
                    "updated_at_github": "2026-09-15T10:00:00Z",
                    "languages": [
                        {"language_name": "Python", "bytes_count": 80000, "percentage_ratio": 80.0},
                        {"language_name": "Dockerfile", "bytes_count": 20000, "percentage_ratio": 20.0}
                    ],
                    "topics": ["fastapi", "docker"]
                }
            ]
        }
        analyzer = GitHubAnalyzer(github_client=mock_gh)
        req = GitHubAnalyzeRequest(
            candidate_id="cand-001",
            github_url="https://github.com/dev",
            target_job_title="Python Developer"
        )
        res = analyzer.analyze_candidate_github(req)

        assert res.status == "SYNCED"
        assert res.public_repos_count == 3
        # Evidence found: Python code bytes verified
        python_dist = next((l for l in res.language_distributions if l.language_name == "Python"), None)
        assert python_dist is not None
        assert python_dist.percentage_ratio == 80.0
        # Verification signal exists even with zero stars
        assert res.activity_signal in ["HIGH", "MODERATE", "LOW"]

    def test_non_disqualification_rule_not_found(self):
        """
        AC-P7-03: Missing or non-existent GitHub profile returns zero penalty (zero disqualification).
        Status is NOT_FOUND and overall rating is UNAVAILABLE, preserving base match score.
        """
        mock_gh = MagicMock(spec=GitHubClient)
        mock_gh.fetch_user_repositories.return_value = {
            "status": "NOT_FOUND",
            "public_repos_count": 0,
            "repositories": []
        }
        analyzer = GitHubAnalyzer(github_client=mock_gh)
        req = GitHubAnalyzeRequest(
            candidate_id="cand-no-gh",
            github_url="https://github.com/nonexistent_user_9999"
        )
        res = analyzer.analyze_candidate_github(req)

        assert res.status == "NOT_FOUND"
        assert res.public_repos_count == 0
        assert res.activity_signal == "LIMITED_OBSERVABLE_ACTIVITY"
        assert res.overall_supporting_rating == "UNAVAILABLE"
        # Summary explicitly states zero-penalty fallback
        assert "zero-penalty" in res.summary_notes

    def test_non_disqualification_rule_private_only(self):
        """
        AC-P7-03: Candidate with only private repositories is not penalized.
        """
        mock_gh = MagicMock(spec=GitHubClient)
        mock_gh.fetch_user_repositories.return_value = {
            "status": "PRIVATE_ONLY",
            "public_repos_count": 0,
            "repositories": []
        }
        analyzer = GitHubAnalyzer(github_client=mock_gh)
        req = GitHubAnalyzeRequest(
            candidate_id="cand-priv",
            github_url="https://github.com/private_dev"
        )
        res = analyzer.analyze_candidate_github(req)

        assert res.status == "PRIVATE_ONLY"
        assert res.overall_supporting_rating == "UNAVAILABLE"
        assert "zero-penalty" in res.summary_notes

    def test_authentication_integrity_no_pat_field(self):
        """
        AC-P7-04: Schema enforces that candidate input does NOT accept personal access tokens (PAT).
        Analysis is strictly OAuth App or public verification.
        """
        fields = GitHubAnalyzeRequest.model_fields
        assert "personal_access_token" not in fields
        assert "pat" not in fields
        assert "token" not in fields
        assert "password" not in fields

    def test_api_endpoint_analyze_github_contract(self, client):
        """Contract verification for POST /internal/ai/analyze-github."""
        payload = {
            "candidate_id": "cand-contract-test",
            "github_url": "https://github.com/octocat",
            "target_job_title": "Software Engineer"
        }
        resp = client.post("/internal/ai/analyze-github", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert "candidate_id" in data
        assert "username" in data
        assert "public_repos_count" in data
        assert "activity_signal" in data
        assert "status" in data
