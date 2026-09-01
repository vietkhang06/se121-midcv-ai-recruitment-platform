import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.schemas.github import GitHubAnalyzeRequest
from app.services.cv_parser import CVParser
from app.services.github_analyzer import GitHubAnalyzer

def test_malformed_cv_input_fallback():
    parser = CVParser()
    req = CVExtractRequest(
        cv_id="cv-malformed-01",
        cv_version_id="cv-ver-malformed-01",
        candidate_id="cand-malformed-01",
        file_type="PDF",
        raw_text=""
    )
    res = parser.parse_cv_document(req)
    assert res.status in ["SUCCESS", "FAILED"]
    assert res.skills is not None

def test_invalid_github_url_graceful_handling():
    analyzer = GitHubAnalyzer()
    req = GitHubAnalyzeRequest(
        candidate_id="cand-invalid-gh",
        github_url="https://github.com/nonexistentuser12345",
        job_industry="Technology"
    )
    res = analyzer.analyze_candidate_github(req)
    assert res.status in ["SYNCED", "UNAVAILABLE"]
    assert res.activity_signal in ["HIGH", "MODERATE", "LOW", "LIMITED_OBSERVABLE_ACTIVITY"]
