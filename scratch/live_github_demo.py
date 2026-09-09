import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath("ai-worker"))

from app.services.github_client import GitHubClient
from app.services.github_analyzer import GitHubAnalyzer
from app.schemas.github import GitHubAnalyzeRequest

def run_live_demo():
    client = GitHubClient()
    username = "octocat"
    print(f"==================================================")
    print(f"1. LIVE GITHUB API FETCH FOR USER: {username}")
    print(f"==================================================")
    raw = client.fetch_user_repositories(username)
    print(f"Status: {raw.get('status')}")
    print(f"Username: {raw.get('username')}")
    print(f"Public Repos Count: {raw.get('public_repos_count')}")
    print(f"Latest Activity: {raw.get('latest_activity_at')}")
    print(f"Total Observed Non-Fork Repos: {len(raw.get('repositories', []))}")

    print("\nSample Repositories & Real Language Bytes:")
    for r in raw.get("repositories", [])[:3]:
        print(f"  * Repo: {r['name']} | Primary: {r['primary_language']} | Stars: {r['stars_count']} | Forks: {r['forks_count']}")
        print(f"    Languages: {r['languages']}")
        print(f"    Topics: {r['topics']}")

    print(f"\n==================================================")
    print(f"2. GITHUB ANALYZER DETERMINISTIC OUTPUT")
    print(f"==================================================")
    analyzer = GitHubAnalyzer(github_client=client)
    req = GitHubAnalyzeRequest(
        candidate_id="00000000-0000-0000-0000-000000000001",
        github_url=f"https://github.com/{username}",
        target_job_title="Fullstack Engineer"
    )
    analysis = analyzer.analyze_candidate_github(req)
    print(f"Status: {analysis.status}")
    print(f"Activity Signal: {analysis.activity_signal}")
    print(f"Language Rank Summary: {analysis.language_rank_summary}")
    print(f"Overall Rating: {analysis.overall_supporting_rating}")
    print(f"Summary Notes: {analysis.summary_notes}")
    print("\nAggregated Language Distribution by Code Bytes:")
    for lang in analysis.language_distributions:
        print(f"  - {lang.language_name}: {lang.bytes_count:,} bytes ({lang.percentage_ratio}%)")

if __name__ == "__main__":
    run_live_demo()
