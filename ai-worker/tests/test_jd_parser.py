import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.jd import JDExtractRequest
from app.services.jd_parser import JDParser

def test_parse_job_description_required_vs_preferred():
    parser = JDParser()
    raw_desc = """
Requirements (Required):
- Java 21 development experience for at least 3 years.
- PostgreSQL database experience.

Preferred:
- Docker containerization.
"""
    req = JDExtractRequest(
        job_id="job-123",
        title="Java Developer",
        industry="Technology",
        raw_description=raw_desc
    )
    res = parser.parse_job_description(req)

    assert res.status == "SUCCESS"
    assert len(res.required_skills) > 0
    assert any(s.normalized_name == "Java" for s in res.required_skills)
    assert any(s.normalized_name == "Docker" for s in res.preferred_skills)
    assert res.required_skills[0].snippet != ""
