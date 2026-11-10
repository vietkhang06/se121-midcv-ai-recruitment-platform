"""Offline regressions: GitHub input integrity and transparent provider health."""
from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.github import GitHubAnalyzeRequest
from app.services.github_analyzer import GitHubAnalyzer


class MustNotFetchClient:
    def fetch_user_repositories(self, username):
        pytest.fail(f"Unexpected GitHub fetch for invalid profile: {username}")


@pytest.mark.parametrize("url", ["", "   ", "https://evil.example/github.com/octocat", "https://github.com/", "http://github.com.evil.example/octocat", "not a github profile", "https://github.com/invalid_user"])
def test_missing_or_foreign_github_profile_never_fetches(url):
    result = GitHubAnalyzer(github_client=MustNotFetchClient()).analyze_candidate_github(
        GitHubAnalyzeRequest(candidate_id="candidate-01", github_url=url)
    )
    assert result.status == "NOT_CONNECTED"
    assert result.overall_supporting_rating == "UNAVAILABLE"
    assert result.public_repos_count == 0
    assert result.language_distributions == []


def test_archived_repos_preserved_but_excluded_from_language_aggregate():
    class FixtureClient:
        def fetch_user_repositories(self, username):
            return {"status": "SYNCED", "public_repos_count": 2,
                    "repositories": [
                        {"name": "old", "repo_url": "https://github.com/dev/old", "is_archived": True,
                         "languages": [{"language_name": "C", "bytes_count": 9000, "percentage_ratio": 100.0}]},
                        {"name": "active", "repo_url": "https://github.com/dev/active", "is_archived": False,
                         "languages": [{"language_name": "Java", "bytes_count": 1000, "percentage_ratio": 100.0}]}]}

    res = GitHubAnalyzer(github_client=FixtureClient()).analyze_candidate_github(
        GitHubAnalyzeRequest(candidate_id="candidate-02", github_url="https://github.com/dev")
    )
    assert len(res.repositories) == 2
    assert res.language_distributions[0].language_name == "Java"
    assert res.language_distributions[0].percentage_ratio == 100.0
    assert len(res.language_distributions) == 1


def test_future_dated_github_evidence_not_treated_as_high_activity():
    future = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    assert GitHubAnalyzer(github_client=MustNotFetchClient())._compute_activity_signal(future) == "LIMITED_OBSERVABLE_ACTIVITY"


def test_valid_url_and_plain_username_resolve_consistently():
    analyzer = GitHubAnalyzer(github_client=MustNotFetchClient())
    assert analyzer._extract_username("https://github.com/octocat/") == "octocat"
    assert analyzer._extract_username("github.com/octocat") == "octocat"
    assert analyzer._extract_username("octocat") == "octocat"
