import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.services.cv_parser import CVParser
from app.services.structured_cv_validator import StructuredCVValidator

def test_gpa_extraction_scale_10():
    """Verify parser extracts GPA 8.3/10 correctly into gpa, gpa_scale, gpa_display."""
    parser = CVParser()
    raw_text = """
    DOAN VIET KHANG
    Email: doanvietkhang06@gmail.com
    Phone: 0762654245
    Headline: Fullstack Software Engineer

    EDUCATION:
    University of Information Technology – VNU-HCM
    Bachelor of Software Engineering (2020 - 2024)
    GPA: 8.3/10

    SKILLS:
    Java, Spring Boot, React, PostgreSQL
    """
    req = CVExtractRequest(
        cv_id="cv-gpa-10",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)
    assert res.status == "SUCCESS"
    assert len(res.educations) >= 1
    edu = res.educations[0]
    assert edu.gpa == 8.3
    assert edu.gpa_scale == 10.0
    assert "8.3/10" in (edu.gpa_display or "")

def test_gpa_extraction_scale_4():
    """Verify parser extracts GPA 3.6/4.0 correctly."""
    parser = CVParser()
    raw_text = """
    LE VAN AN
    Email: levanan@example.com
    Phone: 0912345678

    EDUCATION:
    Bach Khoa University
    Computer Science (2019 - 2023)
    GPA: 3.6/4.0

    SKILLS:
    Go, Kubernetes, Docker
    """
    req = CVExtractRequest(
        cv_id="cv-gpa-4",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)
    assert res.status == "SUCCESS"
    assert len(res.educations) >= 1
    edu = res.educations[0]
    assert edu.gpa == 3.6
    assert edu.gpa_scale == 4.0

def test_no_gpa_provided():
    """Verify that when no GPA is in raw text, gpa fields remain None and no hallucination occurs."""
    parser = CVParser()
    raw_text = """
    TRAN THI B
    Email: tranthib@example.com
    Phone: 0987654321

    EDUCATION:
    Foreign Trade University
    International Business (2018 - 2022)

    SKILLS:
    English, Project Management
    """
    req = CVExtractRequest(
        cv_id="cv-no-gpa",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)
    assert res.status == "SUCCESS"
    assert len(res.educations) >= 1
    edu = res.educations[0]
    assert edu.gpa is None
    assert edu.gpa_scale is None
    assert edu.gpa_display is None

def test_structured_cv_validator_gpa_and_grounding():
    """Test StructuredCVValidator parses GPA and validates grounding without false warnings."""
    validator = StructuredCVValidator()
    json_output = """{
        "personalInfo": {
            "fullName": "Doan Viet Khang",
            "headline": "Full-stack Developer",
            "email": "doanvietkhang06@gmail.com",
            "phone": "0762654245"
        },
        "summary": "Passionate developer",
        "skills": [
            {"name": "Java", "level": null},
            {"name": "Spring Boot", "level": null}
        ],
        "education": [
            {
                "institution": "University of Information Technology",
                "degree": "Bachelor",
                "fieldOfStudy": "Software Engineering",
                "gpa": 8.3,
                "gpa_scale": 10.0,
                "gpa_display": "8.3/10"
            }
        ],
        "experience": [],
        "projects": [],
        "certifications": [],
        "languages": []
    }"""
    raw_text = """
    Doan Viet Khang
    Full-stack Developer
    Email: doanvietkhang06@gmail.com
    Phone: 0762654245
    Skills: Java, Spring Boot
    University of Information Technology - GPA 8.3/10
    """
    valid_json, valid_schema, data, err = validator.validate(json_output, raw_text)
    assert valid_json is True
    assert valid_schema is True
    assert data is not None
    assert data.personalInfo.fullName == "Doan Viet Khang"
    assert data.personalInfo.headline == "Full-stack Developer"
    assert len(data.education) == 1
    assert data.education[0].gpa == 8.3
    assert data.education[0].gpa_scale == 10.0
    assert data.education[0].gpa_display == "8.3/10"
    # No false positive skill warnings
    assert len([w for w in data.warnings if "Spring Boot" in w]) == 0
