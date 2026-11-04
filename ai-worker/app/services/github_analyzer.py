import uuid
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

from app.schemas.github import (
    GitHubAnalyzeRequest, GitHubAnalyzeResponse,
    LanguageDistribution, ExtractedRepo
)
from app.services.github_client import GitHubClient

logger = logging.getLogger(__name__)

class GitHubAnalyzer:
    """
    Deterministic GitHub Analyzer for MidCV.
    Transforms raw GitHub API data into normalized metrics, language distributions,
    and observable activity signals without subjective human-character judgments.
    """
    def __init__(self, github_client: Optional[GitHubClient] = None):
        self.github_client = github_client or GitHubClient()

    def analyze_candidate_github(self, request: GitHubAnalyzeRequest) -> GitHubAnalyzeResponse:
        username = self._extract_username(request.github_url)
        if not username:
            # Never silently map a missing/foreign GitHub URL to an unrelated
            # user. GitHub is optional and must remain a zero-penalty signal.
            return GitHubAnalyzeResponse(
                candidate_id=request.candidate_id,
                username="",
                github_url=request.github_url,
                public_repos_count=0,
                activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
                summary_notes="Không có URL hồ sơ GitHub công khai hợp lệ; bỏ qua tín hiệu GitHub mà không trừ điểm.",
                language_rank_summary="Không có bằng chứng GitHub công khai.",
                overall_supporting_rating="UNAVAILABLE",
                status="NOT_CONNECTED",
            )
        logger.info(f"[GitHubAnalyzer] Analyzing candidate_id='{request.candidate_id}' username='{username}'")

        raw_data = self.github_client.fetch_user_repositories(username)
        status = raw_data.get("status", "SYNCED")

        # Handle explicit lifecycle states
        if status == "NOT_FOUND":
            return GitHubAnalyzeResponse(
                candidate_id=request.candidate_id,
                username=username,
                github_url=request.github_url,
                public_repos_count=0,
                activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
                summary_notes=f"Tài khoản GitHub '{username}' không tồn tại hoặc không tìm thấy trên GitHub công khai. Áp dụng cơ chế fallback bảo toàn điểm cốt lõi (zero-penalty).",
                language_rank_summary="Không có dữ liệu tài khoản công khai.",
                overall_supporting_rating="UNAVAILABLE",
                status="NOT_FOUND"
            )

        if status in ("API_UNAVAILABLE", "RATE_LIMITED"):
            error_note = (
                "Giới hạn tần suất gọi GitHub API (Rate Limit) đã chạm ngưỡng. Áp dụng fallback zero-penalty."
                if status == "RATE_LIMITED"
                else "Dịch vụ GitHub API tạm thời không khả dụng hoặc timeout. Áp dụng fallback zero-penalty."
            )
            return GitHubAnalyzeResponse(
                candidate_id=request.candidate_id,
                username=username,
                github_url=request.github_url,
                public_repos_count=0,
                activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
                summary_notes=error_note,
                language_rank_summary="Dịch vụ GitHub API tạm thời không khả dụng.",
                overall_supporting_rating="UNAVAILABLE",
                status=status
            )

        if status == "PRIVATE_ONLY" or raw_data.get("public_repos_count", 0) == 0 or not raw_data.get("repositories"):
            return GitHubAnalyzeResponse(
                candidate_id=request.candidate_id,
                username=username,
                github_url=request.github_url,
                public_repos_count=raw_data.get("public_repos_count", 0),
                activity_signal="LIMITED_OBSERVABLE_ACTIVITY",
                summary_notes=f"Tài khoản GitHub '{username}' tồn tại nhưng không có kho lưu trữ mã nguồn công khai (private hoặc rỗng). Áp dụng fallback zero-penalty.",
                language_rank_summary="Không có kho lưu trữ công khai khả dụng.",
                overall_supporting_rating="UNAVAILABLE",
                status="PRIVATE_ONLY"
            )

        # 1. Process Repositories & Real Language Distribution
        repos: List[ExtractedRepo] = []
        language_bytes_map: Dict[str, int] = {}
        total_code_bytes = 0

        for r in raw_data.get("repositories", []):
            langs: List[LanguageDistribution] = []
            for lang_info in r.get("languages", []):
                lname = lang_info["language_name"]
                bcount = int(lang_info["bytes_count"])
                pratio = float(lang_info["percentage_ratio"])
                langs.append(LanguageDistribution(
                    language_name=lname,
                    bytes_count=bcount,
                    percentage_ratio=pratio
                ))
                # Historical/archived repositories remain visible as evidence,
                # but do not influence the active repository language ratio.
                if not r.get("is_archived", False):
                    language_bytes_map[lname] = language_bytes_map.get(lname, 0) + bcount
                    total_code_bytes += bcount

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

        # 2. Aggregate Overall Language Distribution by Code Bytes
        overall_languages: List[LanguageDistribution] = []
        if total_code_bytes > 0:
            for lname, bcount in sorted(language_bytes_map.items(), key=lambda item: item[1], reverse=True):
                ratio = round((bcount / total_code_bytes) * 100.0, 2)
                overall_languages.append(LanguageDistribution(
                    language_name=lname,
                    bytes_count=bcount,
                    percentage_ratio=ratio
                ))

        # 3. Format Language Rank Summary
        rank_summaries = [f"Rank #{idx+1}: {l.language_name} ({l.percentage_ratio}%)" for idx, l in enumerate(overall_languages[:5])]
        lang_rank_str = " | ".join(rank_summaries) if rank_summaries else "Chưa có số liệu phân bố mã nguồn."

        # 4. Deterministic Observable Activity Signal
        latest_activity_str = raw_data.get("latest_activity_at")
        activity_signal = self._compute_activity_signal(latest_activity_str)

        # 5. Objective Informational Summary Notes
        latest_text = f"vào ngày {latest_activity_str[:10]}" if latest_activity_str else "chưa xác định"
        summary_notes = (
            f"Phân tích tài khoản GitHub công khai '{username}': "
            f"Số kho lưu trữ công khai: {raw_data.get('public_repos_count', len(repos))}. "
            f"Hoạt động công khai gần nhất {latest_text}. "
            f"Tín hiệu hoạt động quan sát được: {activity_signal}."
        )

        overall_rating = "STRONG_SIGNAL" if activity_signal == "HIGH" else ("MODERATE_SIGNAL" if activity_signal == "MODERATE" else "LIMITED_SIGNAL")

        logger.info(f"[GitHubAnalyzer] Completed analysis for '{username}': activity={activity_signal}, topLang='{lang_rank_str}'")

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
            overall_supporting_rating=overall_rating,
            status="SYNCED"
        )

    def _extract_username(self, url: str) -> str:
        """Return only a GitHub profile username, never infer one from another host."""
        if not url or not url.strip():
            return ""
        value = url.strip()
        if "://" in value:
            parsed = urlparse(value)
            if parsed.scheme.lower() not in ("http", "https") or (parsed.hostname or "").lower() not in ("github.com", "www.github.com"):
                return ""
            parts = [part for part in parsed.path.split("/") if part]
            username = parts[0] if parts else ""
        elif value.lower().startswith(("github.com/", "www.github.com/")):
            username = value.split("/", 1)[1].split("/", 1)[0]
        else:
            # Plain usernames are supported for older API clients; anything
            # containing a URL/path/query separator is not a username.
            username = value
        if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", username):
            return ""
        return username

    def _compute_activity_signal(self, timestamp_str: Optional[str]) -> str:
        """
        Deterministic, objective activity signal based strictly on observable timestamp.
        Does not infer human personality, work ethic, or professionalism.
        """
        if not timestamp_str:
            return "LIMITED_OBSERVABLE_ACTIVITY"
        try:
            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - dt
            if age.total_seconds() < 0:
                return "LIMITED_OBSERVABLE_ACTIVITY"  # Future-dated evidence is not trustworthy.
            days_ago = age.days
            if days_ago <= 14:
                return "HIGH"
            elif days_ago <= 60:
                return "MODERATE"
            elif days_ago <= 180:
                return "LOW"
            else:
                return "LIMITED_OBSERVABLE_ACTIVITY"
        except Exception:
            return "LIMITED_OBSERVABLE_ACTIVITY"
