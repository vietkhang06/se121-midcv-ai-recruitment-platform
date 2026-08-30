import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.schemas.github import (
    GitHubAnalyzeRequest, GitHubAnalyzeResponse,
    LanguageDistribution, ExtractedRepo
)
from app.services.github_client import GitHubClient

logger = logging.getLogger(__name__)

class GitHubAnalyzer:
    def __init__(self, github_client: GitHubClient = None):
        self.github_client = github_client or GitHubClient()

    def analyze_candidate_github(self, request: GitHubAnalyzeRequest) -> GitHubAnalyzeResponse:
        correlation_id = request.correlation_id or str(uuid.uuid4())
        username = self._extract_username(request.github_url)

        raw_data = self.github_client.fetch_user_repositories(username)
        if not raw_data:
            return GitHubAnalyzeResponse(
                candidate_id=request.candidate_id,
                username=username,
                github_url=request.github_url,
                public_repos_count=0,
                activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
                summary_notes="Public GitHub data is unavailable.",
                language_rank_summary="No observable public repositories.",
                overall_supporting_rating="UNAVAILABLE",
                status="UNAVAILABLE"
            )

        # 1. Process Repositories & Language Distribution
        repos: List[ExtractedRepo] = []
        language_bytes_map: Dict[str, int] = {}
        total_bytes = 0

        for r in raw_data.get("repositories", []):
            langs: List[LanguageDistribution] = []
            for lang_info in r.get("languages", []):
                lname = lang_info["language_name"]
                bcount = lang_info["bytes_count"]
                pratio = lang_info["percentage_ratio"]
                langs.append(LanguageDistribution(language_name=lname, bytes_count=bcount, percentage_ratio=pratio))
                
                language_bytes_map[lname] = language_bytes_map.get(lname, 0) + bcount
                total_bytes += bcount

            repos.append(ExtractedRepo(
                name=r["name"],
                repo_url=r["repo_url"],
                description=r.get("description"),
                primary_language=r.get("primary_language"),
                stars_count=r.get("stars_count", 0),
                forks_count=r.get("forks_count", 0),
                is_archived=r.get("is_archived", False),
                updated_at_github=r.get("updated_at_github"),
                languages=langs,
                topics=r.get("topics", [])
            ))

        # Calculate Overall Repository Language Distribution (Ratio %)
        overall_languages: List[LanguageDistribution] = []
        if total_bytes > 0:
            for lname, bcount in sorted(language_bytes_map.items(), key=lambda item: item[1], reverse=True):
                ratio = round((bcount / total_bytes) * 100.0, 2)
                overall_languages.append(LanguageDistribution(language_name=lname, bytes_count=bcount, percentage_ratio=ratio))

        # Format Language Rank Summary
        rank_summaries = [f"Rank #{idx+1}: {l.language_name} ({l.percentage_ratio}%)" for idx, l in enumerate(overall_languages[:3])]
        lang_rank_str = " | ".join(rank_summaries) if rank_summaries else "No language distribution data available."

        # 2. Compute Deterministic Activity Signal based on Latest Observable Timestamp
        latest_activity_str = raw_data.get("latest_activity_at")
        activity_signal = self._compute_activity_signal(latest_activity_str)

        # 3. Formulate Neutral Summary Notes
        latest_text = f"was on {latest_activity_str[:10]}" if latest_activity_str else "was not observable"
        summary_notes = (
            f"Public GitHub profile analysis for candidate '{username}': "
            f"Public repos count: {raw_data.get('public_repos_count', 0)}. "
            f"Latest observable public activity {latest_text}. "
            f"Activity Signal: {activity_signal}."
        )

        return GitHubAnalyzeResponse(
            candidate_id=request.candidate_id,
            username=username,
            github_url=request.github_url,
            public_repos_count=raw_data.get("public_repos_count", len(repos)),
            activity_signal=activity_signal,
            latest_activity_at=latest_activity_str,
            observation_window_days=180,
            language_distributions=overall_languages,
            repositories=repos,
            summary_notes=summary_notes,
            language_rank_summary=lang_rank_str,
            overall_supporting_rating="STRONG_SIGNAL" if activity_signal == "HIGH" else "MODERATE_SIGNAL",
            status="SYNCED"
        )

    def _extract_username(self, url: str) -> str:
        clean = url.rstrip("/").split("/")[-1]
        return clean if clean else "candidate"

    def _compute_activity_signal(self, timestamp_str: Optional[str]) -> str:
        if not timestamp_str:
            return "LIMITED_OBSERVABLE_ACTIVITY"
        try:
            # Parse ISO timestamp
            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            days_ago = (datetime.now(timezone.utc) - dt).days
            if days_ago <= 14:
                return "HIGH"
            elif days_ago <= 60:
                return "MODERATE"
            elif days_ago <= 180:
                return "LOW"
            else:
                return "LIMITED_OBSERVABLE_ACTIVITY"
        except Exception:
            return "MODERATE"
