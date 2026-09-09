import os
import sys
from typing import Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.github import GitHubAnalyzeRequest
from app.services.github_analyzer import GitHubAnalyzer
from app.services.github_client import GitHubClient

class FakeGitHubClient(GitHubClient):
    """Test double for isolated GitHubAnalyzer unit testing without network or production mocks."""
    def __init__(self, fixture_responses: Dict[str, Any]):
        super().__init__(api_base_url="https://api.github.com", token="")
        self.fixture_responses = fixture_responses

    def fetch_user_repositories(self, username: str) -> Dict[str, Any]:
        if username in self.fixture_responses:
            return self.fixture_responses[username]
        return {"username": username, "status": "NOT_FOUND", "error": "NOT_FOUND"}

def test_analyze_candidate_github_case1_valid_public_repositories():
    fixtures = {
        "candidate-java": {
            "username": "candidate-java",
            "github_url": "https://github.com/candidate-java",
            "public_repos_count": 2,
            "latest_activity_at": "2026-09-01T10:00:00Z",
            "status": "SYNCED",
            "repositories": [
                {
                    "name": "enterprise-backend",
                    "repo_url": "https://github.com/candidate-java/enterprise-backend",
                    "description": "Production Java Spring Boot service",
                    "primary_language": "Java",
                    "stars_count": 15,
                    "forks_count": 3,
                    "is_archived": False,
                    "updated_at_github": "2026-09-01T10:00:00Z",
                    "languages": [
                        {"language_name": "Java", "bytes_count": 130000, "percentage_ratio": 68.42},
                        {"language_name": "SQL", "bytes_count": 60000, "percentage_ratio": 31.58}
                    ],
                    "topics": ["spring-boot", "microservices"]
                }
            ]
        }
    }
    client = FakeGitHubClient(fixtures)
    analyzer = GitHubAnalyzer(github_client=client)

    req = GitHubAnalyzeRequest(
        candidate_id="cand-001",
        github_url="https://github.com/candidate-java",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "SYNCED"
    assert res.username == "candidate-java"
    assert len(res.language_distributions) > 0
    assert res.language_distributions[0].language_name == "Java"
    assert res.language_distributions[0].percentage_ratio == 68.42
    assert "Rank #1: Java" in res.language_rank_summary

def test_analyze_candidate_github_case2_private_repositories_only():
    fixtures = {
        "candidate-private": {
            "username": "candidate-private",
            "github_url": "https://github.com/candidate-private",
            "public_repos_count": 0,
            "latest_activity_at": "2026-08-01T10:00:00Z",
            "status": "PRIVATE_ONLY",
            "repositories": []
        }
    }
    client = FakeGitHubClient(fixtures)
    analyzer = GitHubAnalyzer(github_client=client)

    req = GitHubAnalyzeRequest(
        candidate_id="cand-002",
        github_url="https://github.com/candidate-private",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "PRIVATE_ONLY"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert res.public_repos_count == 0
    assert "private" in res.summary_notes or "không có kho lưu trữ" in res.summary_notes

def test_analyze_candidate_github_case3_api_unavailable_or_rate_limited():
    fixtures = {
        "candidate-rate-limited": {
            "username": "candidate-rate-limited",
            "status": "RATE_LIMITED",
            "error": "RATE_LIMITED"
        }
    }
    client = FakeGitHubClient(fixtures)
    analyzer = GitHubAnalyzer(github_client=client)

    req = GitHubAnalyzeRequest(
        candidate_id="cand-003",
        github_url="https://github.com/candidate-rate-limited",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "RATE_LIMITED"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert res.public_repos_count == 0

def test_analyze_candidate_github_case4_not_found_or_not_connected():
    client = FakeGitHubClient({})
    analyzer = GitHubAnalyzer(github_client=client)

    req = GitHubAnalyzeRequest(
        candidate_id="cand-004",
        github_url="https://github.com/candidate-not-registered",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "NOT_FOUND"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert res.public_repos_count == 0
