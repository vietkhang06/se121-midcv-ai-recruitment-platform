import logging
import httpx
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger(__name__)

class GitHubClient:
    """
    Live Public GitHub REST API Client for MatchJD.
    Strictly interacts with api.github.com without mock data or fabricated metrics.
    """
    def __init__(self, api_base_url: Optional[str] = None, token: Optional[str] = None):
        self.api_base_url = (api_base_url or settings.GITHUB_API_BASE_URL).rstrip("/")
        self.token = token if token is not None else settings.GITHUB_TOKEN

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MatchJD-Worker/1.0"
        }
        if self.token and self.token.strip():
            # GitHub supports Bearer token authentication for personal access / fine-grained tokens
            headers["Authorization"] = f"Bearer {self.token.strip()}"
        return headers

    def fetch_user_repositories(self, username: str) -> Dict[str, Any]:
        """
        Fetch public GitHub user profile, discover public repositories (with pagination),
        and retrieve actual language byte counts via /repos/{owner}/{repo}/languages.
        """
        logger.info(f"[GitHubScan] Starting scan for username='{username}' against {self.api_base_url}")
        headers = self._get_headers()

        # Step 1: User Profile Retrieval
        try:
            with httpx.Client(timeout=15.0) as client:
                user_url = f"{self.api_base_url}/users/{username}"
                logger.info(f"[GitHubScan] Requesting profile: {user_url}")
                user_res = client.get(user_url, headers=headers)

                if user_res.status_code == 404:
                    logger.info(f"[GitHubScan] GitHub user not found (HTTP 404): {username}")
                    return {"username": username, "status": "NOT_FOUND", "error": "NOT_FOUND"}
                elif user_res.status_code in [403, 429]:
                    logger.warning(f"[GitHubScan] GitHub API rate limit exceeded (HTTP {user_res.status_code}) for user: {username}")
                    return {"username": username, "status": "RATE_LIMITED", "error": "RATE_LIMITED"}
                elif user_res.status_code != 200:
                    logger.warning(f"[GitHubScan] GitHub User API returned unexpected status {user_res.status_code} for user: {username}")
                    return {"username": username, "status": "API_UNAVAILABLE", "error": "API_UNAVAILABLE"}

                user_data = user_res.json()
                github_login = user_data.get("login", username)
                public_repos_total = user_data.get("public_repos", 0)
                html_url = user_data.get("html_url")
                updated_at = user_data.get("updated_at")

                logger.info(f"[GitHubScan] Profile retrieved for '{github_login}'. Public repos reported by profile: {public_repos_total}")

                if public_repos_total == 0:
                    logger.info(f"[GitHubScan] User '{github_login}' has zero public repositories.")
                    return {
                        "username": github_login,
                        "github_url": html_url,
                        "public_repos_count": 0,
                        "latest_activity_at": updated_at,
                        "repositories": [],
                        "status": "PRIVATE_ONLY"
                    }

                # Step 2: Discover Public Repositories (Pagination)
                all_raw_repos: List[Dict[str, Any]] = []
                page = 1
                per_page = 100

                while True:
                    repos_url = f"{self.api_base_url}/users/{github_login}/repos?type=public&sort=updated&per_page={per_page}&page={page}"
                    logger.info(f"[GitHubScan] Fetching page {page} of repositories: {repos_url}")
                    repos_res = client.get(repos_url, headers=headers)

                    if repos_res.status_code in [403, 429]:
                        logger.warning(f"[GitHubScan] Rate limit hit while fetching repositories on page {page}")
                        return {"username": github_login, "status": "RATE_LIMITED", "error": "RATE_LIMITED"}
                    elif repos_res.status_code != 200:
                        logger.warning(f"[GitHubScan] Repositories API returned status {repos_res.status_code} on page {page}")
                        return {"username": github_login, "status": "API_UNAVAILABLE", "error": "API_UNAVAILABLE"}

                    page_repos = repos_res.json()
                    if not isinstance(page_repos, list) or len(page_repos) == 0:
                        break

                    all_raw_repos.extend(page_repos)
                    if len(page_repos) < per_page:
                        break
                    page += 1

                logger.info(f"[GitHubScan] Total repositories returned from API: {len(all_raw_repos)}")

                # Step 3: Filter non-fork repositories and retrieve exact language bytes
                parsed_repos: List[Dict[str, Any]] = []

                for repo in all_raw_repos:
                    if repo.get("fork", False):
                        continue

                    repo_name = repo.get("name")
                    owner_login = repo.get("owner", {}).get("login", github_login)

                    # Query /repos/{owner}/{repo}/languages for real language byte counts
                    lang_url = f"{self.api_base_url}/repos/{owner_login}/{repo_name}/languages"
                    lang_res = client.get(lang_url, headers=headers)

                    repo_languages: List[Dict[str, Any]] = []
                    if lang_res.status_code == 200:
                        lang_bytes_data = lang_res.json()
                        if isinstance(lang_bytes_data, dict):
                            total_repo_bytes = sum(lang_bytes_data.values())
                            for lname, bcount in lang_bytes_data.items():
                                ratio = round((bcount / total_repo_bytes) * 100.0, 2) if total_repo_bytes > 0 else 0.0
                                repo_languages.append({
                                    "language_name": lname,
                                    "bytes_count": int(bcount),
                                    "percentage_ratio": float(ratio)
                                })
                            logger.info(f"[GitHubScan] Language API repo='{repo_name}' languages={len(repo_languages)} total_bytes={total_repo_bytes}")
                    elif lang_res.status_code in [403, 429]:
                        logger.warning(f"[GitHubScan] Rate limit hit while fetching languages for repo '{repo_name}'")
                        return {"username": github_login, "status": "RATE_LIMITED", "error": "RATE_LIMITED"}
                    else:
                        logger.warning(f"[GitHubScan] Failed to fetch languages for repo '{repo_name}' (status: {lang_res.status_code})")

                    # Primary language metadata is preserved from repo metadata
                    primary_lang = repo.get("language")
                    if not primary_lang:
                        primary_lang = repo_languages[0]["language_name"] if repo_languages else "Other"

                    # Topics
                    topics = repo.get("topics", [])
                    if not isinstance(topics, list):
                        topics = []

                    parsed_repos.append({
                        "name": repo_name,
                        "repo_url": repo.get("html_url", f"https://github.com/{owner_login}/{repo_name}"),
                        "description": repo.get("description"),
                        "primary_language": primary_lang,
                        "stars_count": repo.get("stargazers_count", 0),
                        "forks_count": repo.get("forks_count", 0),
                        "is_archived": repo.get("archived", False),
                        "updated_at_github": repo.get("updated_at"),
                        "languages": repo_languages,
                        "topics": topics
                    })

                if not parsed_repos:
                    logger.info(f"[GitHubScan] No non-fork public repositories found for user '{github_login}'")
                    return {
                        "username": github_login,
                        "github_url": html_url,
                        "public_repos_count": public_repos_total,
                        "latest_activity_at": updated_at,
                        "repositories": [],
                        "status": "PRIVATE_ONLY"
                    }

                logger.info(f"[GitHubScan] Scan completed successfully. Observed {len(parsed_repos)} non-fork public repositories for '{github_login}'.")
                return {
                    "username": github_login,
                    "github_url": html_url,
                    "public_repos_count": public_repos_total,
                    "latest_activity_at": updated_at,
                    "repositories": parsed_repos,
                    "status": "SYNCED"
                }

        except httpx.TimeoutException as e:
            logger.warning(f"[GitHubScan] GitHub API request timed out for '{username}': {e}")
            return {"username": username, "status": "API_UNAVAILABLE", "error": "API_UNAVAILABLE"}
        except Exception as e:
            logger.error(f"[GitHubScan] Unexpected error communicating with GitHub API for '{username}': {e}", exc_info=True)
            return {"username": username, "status": "API_UNAVAILABLE", "error": "API_UNAVAILABLE"}
