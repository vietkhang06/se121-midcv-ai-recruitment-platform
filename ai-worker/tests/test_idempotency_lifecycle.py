import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.schemas.jd import JDExtractRequest
from app.services.cv_parser import CVParser
from app.services.jd_parser import JDParser

def test_idempotent_processing_same_cv_version_twice():
    cv_parser = CVParser()
    req = CVExtractRequest(
        cv_id="cv-999",
        cv_version_id="cv-ver-999",
        file_type="PDF",
        raw_text="Nguyen Van Candidate. Skills: Java 21, Spring Boot."
    )
    
    # Process first time
    res1 = cv_parser.parse_cv_document(req)
    # Process second time (same input & version)
    res2 = cv_parser.parse_cv_document(req)

    assert res1.cv_version_id == res2.cv_version_id
    assert res1.status == "SUCCESS"
    assert res2.status == "SUCCESS"
    assert len(res1.skills) == len(res2.skills)

def test_idempotent_processing_same_jd_twice():
    jd_parser = JDParser()
    req = JDExtractRequest(
        job_id="job-888",
        title="Senior Java Dev",
        industry="Technology",
        raw_description="Required: Java, Spring Boot. Preferred: Docker."
    )

    res1 = jd_parser.parse_job_description(req)
    res2 = jd_parser.parse_job_description(req)

    assert res1.job_id == res2.job_id
    assert res1.status == "SUCCESS"
    assert res2.status == "SUCCESS"
    assert len(res1.required_skills) == len(res2.required_skills)
