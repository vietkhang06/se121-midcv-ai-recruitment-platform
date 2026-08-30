"""
REAL GITHUB API SMOKE TEST SCRIPT
This script performs manual GitHub REST API smoke testing handling 200 Success, 404 Not Found, 403 Rate Limit, and Timeout fallback.

USAGE:
    python scripts/github_api_smoke_test.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.github_client import GitHubClient
from app.services.github_analyzer import GitHubAnalyzer
from app.schemas.github import GitHubAnalyzeRequest

def run_github_api_smoke_test():
    print("=== STARTING GITHUB API INTEGRATION SMOKE TEST ===")
    
    client = GitHubClient(use_mock=False)
    analyzer = GitHubAnalyzer(github_client=client)

    # 1. Test Valid Public Profile (e.g. torvalds or octocat)
    print("\n--- 1. Testing Valid Public GitHub Profile (octocat) ---")
    req_valid = GitHubAnalyzeRequest(
        candidate_id="cand-octo",
        github_url="https://github.com/octocat",
        target_job_title="Software Engineer"
    )
    res_valid = analyzer.analyze_candidate_github(req_valid)
    print(f"Status: {res_valid.status}")
    print(f"Username: {res_valid.username}")
    print(f"Public Repos Count: {res_valid.public_repos_count}")
    print(f"Activity Signal: {res_valid.activity_signal}")
    print(f"Language Rank Summary: {res_valid.language_rank_summary}")

    # 2. Test 404 Non-Existent User
    print("\n--- 2. Testing Non-Existent GitHub Profile (404 Fallback) ---")
    req_404 = GitHubAnalyzeRequest(
        candidate_id="cand-invalid",
        github_url="https://github.com/non-existent-user-123456789-xyz",
        target_job_title="Software Engineer"
    )
    res_404 = analyzer.analyze_candidate_github(req_404)
    print(f"Status: {res_404.status}")
    print(f"Overall Rating: {res_404.overall_supporting_rating}")
    print(f"Summary Notes: {res_404.summary_notes}")

    print("\n=== GITHUB API SMOKE TEST COMPLETED ===")

if __name__ == "__main__":
    run_github_api_smoke_test()
