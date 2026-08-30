import logging
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.fixtures.mock_github import MOCK_GITHUB_DATA

logger = logging.getLogger(__name__)

class GitHubClient:
    """
    GitHub Client Abstraction supporting public GitHub REST API fetching
    with graceful fallback to mock data when unauthenticated or rate-limited.
    """
    def __init__(self, use_mock: bool = settings.USE_MOCK_GITHUB):
        self.use_mock = use_mock

    def fetch_user_repositories(self, username: str) -> Optional[Dict[str, Any]]:
        if self.use_mock:
            logger.info(f"Using Mock GitHub Client data for username: {username}")
            if username in MOCK_GITHUB_DATA:
                return MOCK_GITHUB_DATA[username]
            return MOCK_GITHUB_DATA.get("candidate-java")

        # Live Public GitHub API Request
        try:
            headers = {"Accept": "application/vnd.github.v3+json"}
            if settings.GITHUB_TOKEN:
                headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

            with httpx.Client(timeout=10.0) as client:
                user_res = client.get(f"https://api.github.com/users/{username}", headers=headers)
                if user_res.status_code != 200:
                    logger.warning(f"GitHub User API returned status {user_res.status_code}")
                    return self._fallback_data(username)

                user_data = user_res.json()

                repos_res = client.get(f"https://api.github.com/users/{username}/repos?type=public&sort=updated", headers=headers)
                repos_data = repos_res.json() if repos_res.status_code == 200 else []

                parsed_repos = []
                for repo in repos_data:
                    if repo.get("fork", False):
                        continue
                    
                    lang_name = repo.get("language") or "Other"
                    parsed_repos.append({
                        "name": repo.get("name"),
                        "repo_url": repo.get("html_url"),
                        "description": repo.get("description"),
                        "primary_language": lang_name,
                        "stars_count": repo.get("stargazers_count", 0),
                        "forks_count": repo.get("forks_count", 0),
                        "is_archived": repo.get("archived", False),
                        "updated_at_github": repo.get("updated_at"),
                        "languages": [{"language_name": lang_name, "bytes_count": 1000, "percentage_ratio": 100.0}],
                        "topics": repo.get("topics", [])
                    })

                return {
                    "username": username,
                    "github_url": user_data.get("html_url"),
                    "public_repos_count": user_data.get("public_repos", len(parsed_repos)),
                    "latest_activity_at": user_data.get("updated_at"),
                    "repositories": parsed_repos
                }
        except Exception as e:
            logger.warning(f"GitHub API request failed ({e}). Applying graceful fallback.")
            return self._fallback_data(username)

    def _fallback_data(self, username: str) -> Dict[str, Any]:
        return MOCK_GITHUB_DATA.get("candidate-java")
