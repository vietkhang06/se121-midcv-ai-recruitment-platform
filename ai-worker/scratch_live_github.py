import httpx
import json

def test_live_github():
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "MatchProof-Audit/1.0"}
    client = httpx.Client(timeout=10.0)
    
    # Test real public GitHub account: octocat
    username = "octocat"
    print(f"Fetching GitHub user: {username}...")
    user_res = client.get(f"https://api.github.com/users/{username}", headers=headers)
    print(f"User HTTP Status: {user_res.status_code}")
    
    if user_res.status_code == 200:
        user_data = user_res.json()
        print(f"Login: {user_data.get('login')}")
        print(f"HTML URL: {user_data.get('html_url')}")
        print(f"Public Repos: {user_data.get('public_repos')}")
        print(f"Latest Updated At: {user_data.get('updated_at')}")
        
        repos_res = client.get(f"https://api.github.com/users/{username}/repos?type=public&sort=updated", headers=headers)
        print(f"Repos HTTP Status: {repos_res.status_code}")
        if repos_res.status_code == 200:
            repos = repos_res.json()
            print(f"Fetched {len(repos)} repositories successfully.")
            for r in repos[:4]:
                print(f"  - Repo: {r.get('name')}")
                print(f"    Language: {r.get('language')}")
                print(f"    Stars: {r.get('stargazers_count')}, Forks: {r.get('forks_count')}")
                print(f"    Updated: {r.get('updated_at')}")
                print(f"    Description: {r.get('description')}")
    # Test GitHubAnalyzer with use_mock=False
    from app.services.github_client import GitHubClient
    from app.services.github_analyzer import GitHubAnalyzer
    from app.schemas.github import GitHubAnalyzeRequest

    analyzer = GitHubAnalyzer(github_client=GitHubClient(use_mock=False))
    req = GitHubAnalyzeRequest(
        candidate_id="00000000-0000-0000-0000-000000000001",
        github_url="https://github.com/octocat"
    )
    result = analyzer.analyze_candidate_github(req)
    print("\n--- GitHubAnalyzer Result with Live GitHub API ---")
    print(f"Status: {result.status}")
    print(f"Username: {result.username}")
    print(f"Public Repos Count: {result.public_repos_count}")
    print(f"Activity Signal: {result.activity_signal}")
    print(f"Latest Activity At: {result.latest_activity_at}")
    print(f"Language Rank Summary: {result.language_rank_summary}")
    print(f"Summary Notes: {result.summary_notes}")
    print(f"Extracted Repositories count: {len(result.repositories)}")
    for repo in result.repositories[:3]:
        print(f"  * {repo.name} | Lang: {repo.primary_language} | Stars: {repo.stars_count} | Forks: {repo.forks_count} | Updated: {repo.updated_at_github}")

if __name__ == "__main__":
    test_live_github()
