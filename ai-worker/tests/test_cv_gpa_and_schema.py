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


def test_gpa_extraction_comma_decimal():
    """Verify parser correctly extracts GPA with Vietnamese comma decimal (e.g. 3,45/4.0)."""
    parser = CVParser()
    raw_text = """
    NGUYEN VAN C
    Email: nguyen.c@example.com
    Phone: 0981112233

    HỌC VẤN:
    Đại học Bách Khoa TP.HCM
    Kỹ sư Công nghệ Thông tin (2018 - 2022)
    Điểm trung bình: 3,45/4.0

    KỸ NĂNG:
    Python, FastAPI, Docker
    """
    req = CVExtractRequest(
        cv_id="cv-gpa-comma",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)
    assert res.status == "SUCCESS"
    assert len(res.educations) >= 1
    edu = res.educations[0]
    assert edu.gpa == 3.45
    assert edu.gpa_scale == 4.0
    assert "3.45/4" in (edu.gpa_display or "")


def test_gpa_extraction_unspecified_scale_decision_1():
    """Verify Decision 1: when no scale is specified, val <= 4.0 defaults to 4.0, val > 4.0 defaults to 10.0."""
    parser = CVParser()
    raw_text_4 = """
    LE THI D
    Email: led@example.com
    Phone: 0912223344

    EDUCATION:
    VNU University of Science
    Computer Science (2019 - 2023)
    GPA: 3.75

    SKILLS:
    Java, Spring Boot
    """
    res_4 = parser.parse_cv_document(CVExtractRequest(
        cv_id="cv-gpa-unspec-4",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text_4
    ))
    assert res_4.status == "SUCCESS"
    assert res_4.educations[0].gpa == 3.75
    assert res_4.educations[0].gpa_scale == 4.0

    raw_text_10 = """
    HOANG VAN E
    Email: hoange@example.com
    Phone: 0933334455

    HỌC VẤN:
    Đại học Kinh tế - Luật
    Hệ thống Thông tin Quản lý (2017 - 2021)
    Điểm tích lũy: 8,6

    KỸ NĂNG:
    SQL, Tableau
    """
    res_10 = parser.parse_cv_document(CVExtractRequest(
        cv_id="cv-gpa-unspec-10",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text_10
    ))
    assert res_10.status == "SUCCESS"
    assert res_10.educations[0].gpa == 8.6
    assert res_10.educations[0].gpa_scale == 10.0


def test_cpa_keyword_and_non_hallucination_from_projects():
    """Verify CPA keyword is extracted, and numbers in projects (e.g. 3.5x boost) do not hallucinate into empty education GPA."""
    parser = CVParser()
    raw_text = """
    TRAN VAN F
    Email: tranf@example.com
    Phone: 0944445566

    EDUCATION:
    Hanoi University of Science and Technology
    Software Engineering (2016 - 2020)
    CPA: 3.65/4.0

    EXPERIENCE:
    Startup ABC (2020 - 2023)
    Increased microservice transaction throughput by 4.5x and optimized latency by 2.8x.

    SKILLS:
    Golang, Redis
    """
    res = parser.parse_cv_document(CVExtractRequest(
        cv_id="cv-cpa-test",
        cv_version_id="v1",
        file_type="PDF",
        raw_text=raw_text
    ))
    assert res.status == "SUCCESS"
    assert res.educations[0].gpa == 3.65
    assert res.educations[0].gpa_scale == 4.0
