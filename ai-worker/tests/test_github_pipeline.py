import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.github_client import GitHubClient
from app.services.github_analyzer import GitHubAnalyzer
from app.schemas.github import GitHubAnalyzeRequest

# ==============================================================================
# MATCHJD COMPREHENSIVE GITHUB SCANNING & EVIDENCE PIPELINE TEST SUITE (GH-01 -> GH-08)
# ==============================================================================

def test_gh01_valid_real_public_github_account():
    """TEST GH-01: Valid real public GitHub account (octocat)"""
    client = GitHubClient()
    data = client.fetch_user_repositories("octocat")

    assert data["status"] == "SYNCED"
    assert data["username"].lower() == "octocat"
    assert data["public_repos_count"] > 0
    assert len(data["repositories"]) > 0

    # Ensure /languages was called and language entries are present
    repos_with_languages = [r for r in data["repositories"] if len(r["languages"]) > 0]
    assert len(repos_with_languages) > 0, "Expected at least one repo to contain real language data from /languages API"

    sample_repo = repos_with_languages[0]
    sample_lang = sample_repo["languages"][0]
    assert sample_lang["bytes_count"] > 0
    assert sample_lang["percentage_ratio"] > 0.0

def test_gh02_repository_with_multiple_languages():
    """TEST GH-02: Repository with multiple languages (e.g. Spoon-Knife has HTML and CSS)"""
    client = GitHubClient()
    data = client.fetch_user_repositories("octocat")
    assert data["status"] == "SYNCED"

    spoon_knife = next((r for r in data["repositories"] if r["name"] == "Spoon-Knife"), None)
    assert spoon_knife is not None, "Spoon-Knife repository should exist on octocat"
    assert len(spoon_knife["languages"]) >= 2, f"Expected multi-language entries, got: {spoon_knife['languages']}"

    # Verify percentages are mathematically grounded from real bytes
    total_bytes = sum(l["bytes_count"] for l in spoon_knife["languages"])
    for l in spoon_knife["languages"]:
        expected_ratio = round((l["bytes_count"] / total_bytes) * 100.0, 2)
        assert abs(l["percentage_ratio"] - expected_ratio) < 0.05

def test_gh03_repository_with_one_language():
    """TEST GH-03: Repository with one language has percentage = 100 only if API data contains only that language"""
    class SingleLangClient(GitHubClient):
        def fetch_user_repositories(self, username: str):
            return {
                "username": username,
                "status": "SYNCED",
                "public_repos_count": 1,
                "latest_activity_at": "2026-09-01T10:00:00Z",
                "repositories": [{
                    "name": "pure-java-repo",
                    "repo_url": "https://github.com/user/pure-java-repo",
                    "primary_language": "Java",
                    "languages": [{"language_name": "Java", "bytes_count": 54321, "percentage_ratio": 100.0}],
                    "topics": []
                }]
            }

    analyzer = GitHubAnalyzer(github_client=SingleLangClient())
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-single",
        github_url="https://github.com/user"
    ))
    assert res.status == "SYNCED"
    assert len(res.language_distributions) == 1
    assert res.language_distributions[0].language_name == "Java"
    assert res.language_distributions[0].percentage_ratio == 100.0

def test_gh04_invalid_github_username():
    """TEST GH-04: Invalid GitHub username returns NOT_FOUND with zero fake repos"""
    client = GitHubClient()
    data = client.fetch_user_repositories("nonexistent-github-user-matchjd-404-xyz123")
    assert data["status"] == "NOT_FOUND"
    assert data.get("repositories") is None

    analyzer = GitHubAnalyzer(github_client=client)
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-invalid",
        github_url="https://github.com/nonexistent-github-user-matchjd-404-xyz123"
    ))
    assert res.status == "NOT_FOUND"
    assert res.public_repos_count == 0
    assert len(res.repositories) == 0
    assert res.overall_supporting_rating == "UNAVAILABLE"

def test_gh05_github_api_failure():
    """TEST GH-05: GitHub API failure returns API_UNAVAILABLE without fake success or mock fallback"""
    # Force connection error with invalid port
    client = GitHubClient(api_base_url="http://127.0.0.1:59999")
    data = client.fetch_user_repositories("octocat")
    assert data["status"] == "API_UNAVAILABLE"
    assert data.get("repositories") is None

    analyzer = GitHubAnalyzer(github_client=client)
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-fail",
        github_url="https://github.com/octocat"
    ))
    assert res.status == "API_UNAVAILABLE"
    assert res.public_repos_count == 0
    assert len(res.repositories) == 0
    assert res.overall_supporting_rating == "UNAVAILABLE"

def test_gh06_candidate_has_no_public_repositories():
    """TEST GH-06: Candidate has no public repositories -> PRIVATE_ONLY without fake repos"""
    class NoRepoClient(GitHubClient):
        def fetch_user_repositories(self, username: str):
            return {
                "username": username,
                "status": "PRIVATE_ONLY",
                "public_repos_count": 0,
                "latest_activity_at": "2026-08-01T10:00:00Z",
                "repositories": []
            }

    analyzer = GitHubAnalyzer(github_client=NoRepoClient())
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-private",
        github_url="https://github.com/private-user"
    ))
    assert res.status == "PRIVATE_ONLY"
    assert res.public_repos_count == 0
    assert len(res.repositories) == 0
    assert res.overall_supporting_rating == "UNAVAILABLE"

def test_gh08_language_aggregation():
    """TEST GH-08: Language aggregation compares manual byte calculation with analyzer output"""
    class MultiRepoClient(GitHubClient):
        def fetch_user_repositories(self, username: str):
            return {
                "username": username,
                "status": "SYNCED",
                "public_repos_count": 2,
                "latest_activity_at": "2026-09-01T10:00:00Z",
                "repositories": [
                    {
                        "name": "repo-a",
                        "repo_url": "https://github.com/user/repo-a",
                        "primary_language": "Java",
                        "languages": [
                            {"language_name": "Java", "bytes_count": 150000, "percentage_ratio": 88.24},
                            {"language_name": "Python", "bytes_count": 20000, "percentage_ratio": 11.76}
                        ],
                        "topics": []
                    },
                    {
                        "name": "repo-b",
                        "repo_url": "https://github.com/user/repo-b",
                        "primary_language": "Java",
                        "languages": [
                            {"language_name": "Java", "bytes_count": 80000, "percentage_ratio": 61.54},
                            {"language_name": "TypeScript", "bytes_count": 50000, "percentage_ratio": 38.46}
                        ],
                        "topics": []
                    }
                ]
            }

    analyzer = GitHubAnalyzer(github_client=MultiRepoClient())
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-agg",
        github_url="https://github.com/user"
    ))

    # Expected:
    # Java: 150,000 + 80,000 = 230,000 bytes (76.67%)
    # TypeScript: 50,000 bytes (16.67%)
    # Python: 20,000 bytes (6.67%)
    # Total: 300,000 bytes
    dist_map = {l.language_name: l for l in res.language_distributions}
    assert dist_map["Java"].bytes_count == 230000
    assert dist_map["Java"].percentage_ratio == 76.67

    assert dist_map["TypeScript"].bytes_count == 50000
    assert dist_map["TypeScript"].percentage_ratio == 16.67

    assert dist_map["Python"].bytes_count == 20000
    assert dist_map["Python"].percentage_ratio == 6.67
