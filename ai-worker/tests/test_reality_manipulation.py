import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.schemas.jd import JDExtractRequest
from app.schemas.github import GitHubAnalyzeRequest
from app.services.cv_parser import CVParser
from app.services.jd_parser import JDParser
from app.services.github_analyzer import GitHubAnalyzer
from app.services.cache_service import MemoryCacheService
from app.services.normalizer import normalize_skill_name

def test_manipulation_cv_content_changes_extracted_skills():
    parser = CVParser()
    
    # Candidate 1: Java backend
    req_java = CVExtractRequest(
        cv_id="cv-test-01",
        cv_version_id="ver-01",
        candidate_id="cand-01",
        file_type="PDF",
        raw_text="Experienced engineer with Java, Spring Boot, and PostgreSQL."
    )
    res_java = parser.parse_cv_document(req_java)
    skills_java = [s.normalized_name for s in res_java.skills]
    assert "Java" in skills_java
    assert "Spring Boot" in skills_java

    # Candidate 2: Python / Django
    req_python = CVExtractRequest(
        cv_id="cv-test-02",
        cv_version_id="ver-02",
        candidate_id="cand-02",
        file_type="PDF",
        raw_text="Experienced engineer with Python, Django, and Redis caching."
    )
    res_python = parser.parse_cv_document(req_python)
    skills_python = [s.normalized_name for s in res_python.skills]
    assert "Java" not in skills_python
    assert "Python" in skills_python

def test_manipulation_jd_adding_required_skill_alters_gating():
    parser = JDParser()
    
    # JD 1: Java + Spring Boot
    req1 = JDExtractRequest(
        job_id="job-01",
        title="Java Developer",
        industry="Technology",
        raw_description="We need a Java and Spring Framework engineer."
    )
    res1 = parser.parse_job_description(req1)
    req_skills_1 = [s.normalized_name for s in res1.required_skills]
    assert "Java" in req_skills_1
    assert "Kubernetes" not in req_skills_1

    # JD 2: Java + Spring Boot + Kubernetes
    req2 = JDExtractRequest(
        job_id="job-02",
        title="Senior Java Kubernetes Developer",
        industry="Technology",
        raw_description="Required: Java, Spring Framework, and Kubernetes."
    )
    res2 = parser.parse_job_description(req2)
    req_skills_2 = [s.normalized_name for s in res2.required_skills]
    assert "Kubernetes" in req_skills_2

def test_manipulation_cache_hit_and_miss_behavior():
    cache = MemoryCacheService(default_ttl_seconds=60)
    
    content_a = "Java Spring Boot engineer"
    content_b = "Python Django engineer"
    
    # 1. Initial miss
    assert cache.get("CV", content_a) is None
    
    # 2. Store in cache
    cache.set("CV", content_a, {"skills": ["Java", "Spring Boot"]})
    
    # 3. Cache hit on identical input
    cached_res = cache.get("CV", content_a)
    assert cached_res is not None
    assert cached_res["skills"] == ["Java", "Spring Boot"]
    
    # 4. Cache miss on altered input
    assert cache.get("CV", content_b) is None

def test_manipulation_github_5_branches():
    analyzer = GitHubAnalyzer()
    
    # Case 1: GitHub available
    res1 = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-01",
        github_url="https://github.com/candidate-java",
        target_job_title="Senior Java Developer"
    ))
    assert res1.status == "SYNCED"
    assert res1.overall_supporting_rating in ["STRONG_SIGNAL", "MODERATE_SIGNAL"]
    
    # Case 2: No GitHub / Not registered
    res2 = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-02",
        github_url="https://github.com/candidate-not-found-xyz",
        target_job_title="Senior Java Developer"
    ))
    assert res2.status == "NOT_FOUND"
    assert res2.overall_supporting_rating == "UNAVAILABLE"
    
    # Case 3: Private repo
    res3 = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-03",
        github_url="https://github.com/candidate-private",
        target_job_title="Senior Java Developer"
    ))
    assert res3.status == "PRIVATE_ONLY"
    assert res3.overall_supporting_rating == "UNAVAILABLE"
    
    # Case 4: API failure / rate limited
    res4 = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-04",
        github_url="https://github.com/candidate-rate-limited",
        target_job_title="Senior Java Developer"
    ))
    assert res4.status == "API_UNAVAILABLE"
    assert res4.overall_supporting_rating == "UNAVAILABLE"

def test_programming_language_distribution_calculation():
    from app.services.github_client import GitHubClient
    
    # Custom client returning multi-language repositories
    class MultiLangClient(GitHubClient):
        def fetch_user_repositories(self, username: str):
            return {
                "username": username,
                "public_repos_count": 3,
                "status": "SYNCED",
                "latest_activity_at": "2026-08-25T10:00:00Z",
                "repositories": [
                    {
                        "name": "backend-repo",
                        "repo_url": "https://github.com/test/backend",
                        "primary_language": "Java",
                        "languages": [{"language_name": "Java", "bytes_count": 8000, "percentage_ratio": 100.0}]
                    },
                    {
                        "name": "frontend-repo",
                        "repo_url": "https://github.com/test/frontend",
                        "primary_language": "TypeScript",
                        "languages": [{"language_name": "TypeScript", "bytes_count": 2000, "percentage_ratio": 100.0}]
                    }
                ]
            }
            
    analyzer = GitHubAnalyzer(github_client=MultiLangClient())
    res = analyzer.analyze_candidate_github(GitHubAnalyzeRequest(
        candidate_id="cand-lang-test",
        github_url="https://github.com/test-user"
    ))
    
    assert res.status == "SYNCED"
    assert len(res.language_distributions) == 2
    # 8000 / 10000 = 80%, 2000 / 10000 = 20%
    lang_map = {l.language_name: l.percentage_ratio for l in res.language_distributions}
    assert lang_map["Java"] == 80.0
    assert lang_map["TypeScript"] == 20.0
    assert "Rank #1: Java (80.0%)" in res.language_rank_summary

def test_observable_activity_signal_recency():
    analyzer = GitHubAnalyzer()
    
    # Within 14 days -> HIGH
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    
    ts_high = (now - timedelta(days=5)).isoformat()
    assert analyzer._compute_activity_signal(ts_high) == "HIGH"
    
    # 30 days -> MODERATE
    ts_mod = (now - timedelta(days=30)).isoformat()
    assert analyzer._compute_activity_signal(ts_mod) == "MODERATE"
    
    # 100 days -> LOW
    ts_low = (now - timedelta(days=100)).isoformat()
    assert analyzer._compute_activity_signal(ts_low) == "LOW"
    
    # 250 days -> LIMITED_OBSERVABLE_ACTIVITY
    ts_limited = (now - timedelta(days=250)).isoformat()
    assert analyzer._compute_activity_signal(ts_limited) == "LIMITED_OBSERVABLE_ACTIVITY"

