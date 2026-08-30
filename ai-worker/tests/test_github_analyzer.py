import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.github import GitHubAnalyzeRequest
from app.services.github_analyzer import GitHubAnalyzer

def test_analyze_candidate_github_language_distribution_and_activity():
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
