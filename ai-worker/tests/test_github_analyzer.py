import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.github import GitHubAnalyzeRequest
from app.services.github_analyzer import GitHubAnalyzer

def test_analyze_candidate_github_case1_valid_public_repositories():
    analyzer = GitHubAnalyzer()
    req = GitHubAnalyzeRequest(
        candidate_id="cand-001",
        github_url="https://github.com/candidate-java",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "SYNCED"
    assert res.username == "candidate-java"
    assert res.activity_signal == "HIGH"
    assert len(res.language_distributions) > 0
    assert res.language_distributions[0].language_name == "Java"
    assert res.language_distributions[0].percentage_ratio == 68.42
    assert "Rank #1: Java" in res.language_rank_summary

def test_analyze_candidate_github_case2_private_repositories_only():
    analyzer = GitHubAnalyzer()
    req = GitHubAnalyzeRequest(
        candidate_id="cand-002",
        github_url="https://github.com/candidate-private",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "PRIVATE_ONLY"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert res.public_repos_count == 0
    assert "private or inaccessible" in res.summary_notes

def test_analyze_candidate_github_case3_api_unavailable_or_rate_limited():
    analyzer = GitHubAnalyzer()
    req = GitHubAnalyzeRequest(
        candidate_id="cand-003",
        github_url="https://github.com/candidate-rate-limited",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "API_UNAVAILABLE"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert "unavailable or rate limited" in res.summary_notes

def test_analyze_candidate_github_case4_not_found_or_not_connected():
    analyzer = GitHubAnalyzer()
    req = GitHubAnalyzeRequest(
        candidate_id="cand-004",
        github_url="https://github.com/candidate-not-registered",
        target_job_title="Senior Java Developer"
    )
    res = analyzer.analyze_candidate_github(req)

    assert res.status == "NOT_FOUND"
    assert res.overall_supporting_rating == "UNAVAILABLE"
    assert res.public_repos_count == 0
    assert "not found or is not connected" in res.summary_notes
