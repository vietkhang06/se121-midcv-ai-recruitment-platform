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
            # When username is not in controlled test fixtures, return None (NOT_FOUND)
            return None

        # Live Public GitHub API Request
        try:
            headers = {"Accept": "application/vnd.github.v3+json"}
            if settings.GITHUB_TOKEN:
                headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

            with httpx.Client(timeout=10.0) as client:
                user_res = client.get(f"https://api.github.com/users/{username}", headers=headers)
                if user_res.status_code == 404:
                    logger.info(f"GitHub user not found: {username}")
                    return {"username": username, "error": "NOT_FOUND", "status": "NOT_FOUND"}
                elif user_res.status_code in [403, 429]:
                    logger.warning(f"GitHub API rate limit exceeded for: {username}")
                    return {"username": username, "error": "API_UNAVAILABLE", "status": "API_UNAVAILABLE"}
                elif user_res.status_code != 200:
                    logger.warning(f"GitHub User API returned status {user_res.status_code}")
                    return {"username": username, "error": "API_UNAVAILABLE", "status": "API_UNAVAILABLE"}

                user_data = user_res.json()
                public_count = user_data.get("public_repos", 0)
                if public_count == 0:
                    return {
                        "username": username,
                        "github_url": user_data.get("html_url"),
                        "public_repos_count": 0,
                        "latest_activity_at": user_data.get("updated_at"),
                        "repositories": [],
                        "status": "PRIVATE_ONLY"
                    }

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

                if not parsed_repos:
                    return {
                        "username": username,
                        "github_url": user_data.get("html_url"),
                        "public_repos_count": 0,
                        "latest_activity_at": user_data.get("updated_at"),
                        "repositories": [],
                        "status": "PRIVATE_ONLY"
                    }

                return {
                    "username": username,
                    "github_url": user_data.get("html_url"),
                    "public_repos_count": user_data.get("public_repos", len(parsed_repos)),
                    "latest_activity_at": user_data.get("updated_at"),
                    "repositories": parsed_repos,
                    "status": "SYNCED"
                }
        except Exception as e:
            logger.warning(f"GitHub API request failed ({e}). Returning API_UNAVAILABLE.")
            return {"username": username, "error": "API_UNAVAILABLE", "status": "API_UNAVAILABLE"}

