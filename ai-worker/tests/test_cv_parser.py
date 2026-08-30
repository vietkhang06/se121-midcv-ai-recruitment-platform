import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.services.cv_parser import CVParser, map_heading_to_canonical_section

def test_parse_cv_document_text():
    parser = CVParser()
    raw_text = """
NGUYEN VAN CANDIDATE
Email: candidate@example.com

SKILLS
Java 21, Spring Boot, PostgreSQL

WORK EXPERIENCE
Senior Engineer at TechCorp Vietnam (2022 - Present)
    """
    req = CVExtractRequest(
        cv_id="cv-100",
        cv_version_id="cv-ver-100",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert res.cv_version_id == "cv-ver-100"
    assert len(res.skills) > 0
    assert any(s.normalized_name == "Java" for s in res.skills)
    assert len(res.evidences) > 0

def test_section_heading_alias_mapping():
    assert map_heading_to_canonical_section("Technical Skills") == "SKILLS"
    assert map_heading_to_canonical_section("Core Competencies") == "SKILLS"
    assert map_heading_to_canonical_section("Professional Experience") == "EXPERIENCE"
    assert map_heading_to_canonical_section("Employment History") == "EXPERIENCE"
    assert map_heading_to_canonical_section("Academic Background") == "EDUCATION"
    assert map_heading_to_canonical_section("Selected Projects") == "PROJECTS"
    assert map_heading_to_canonical_section("Spoken Languages") == "LANGUAGES"
