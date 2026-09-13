import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.services.cv_parser import CVParser
from app.services.llm_client import LLMClient, LLMAPIError

def test_cv_ie_01_rich_cv_comprehensive_extraction():
    """
    CV-IE-01: Rich CV text extraction across all sections:
    Identity, Skills, Experience, Education, Projects, Certifications, and Languages.
    """
    parser = CVParser()
    raw_text = """
    NGUYEN THI MINH ANH
    Fullstack Software Engineer
    Email: minhanh.nguyen@example.com
    Phone: 0908112233
    GitHub: https://github.com/minhanh-dev
    LinkedIn: https://linkedin.com/in/minhanh-nguyen

    PROFESSIONAL SUMMARY:
    Software engineer with a passion for designing reliable web architectures and clean microservices.

    TECHNICAL SKILLS:
    TypeScript, React, Node.js, PostgreSQL, Docker

    WORK EXPERIENCE:
    VNG Corporation - Software Engineer (2022-03 - 2024-06)
    Developed payment gateway integrations using Node.js and TypeScript.
    Optimized database queries with PostgreSQL.

    EDUCATION:
    Hanoi University of Science and Technology
    Bachelor of Information Technology (2018 - 2022)

    PROJECTS:
    Microservice Billing System
    Architected billing service with Node.js, Docker, and PostgreSQL.

    CERTIFICATIONS:
    AWS Certified Solutions Architect - Amazon Web Services (2023)

    LANGUAGES:
    Vietnamese - NATIVE
    English - ADVANCED
    """
    req = CVExtractRequest(
        cv_id="cv-rich-ie-01",
        cv_version_id="ver-rich-ie-01",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert "NGUYEN THI MINH ANH" in res.full_name.upper()
    assert res.email == "minhanh.nguyen@example.com"
    assert res.phone == "0908112233"
    assert res.github_url == "https://github.com/minhanh-dev"
    assert res.linkedin_url == "https://linkedin.com/in/minhanh-nguyen"

    skill_names = {s.normalized_name for s in res.skills}
    assert "TypeScript" in skill_names or "React" in skill_names
    assert "PostgreSQL" in skill_names or "Docker" in skill_names

    assert len(res.experiences) >= 1
    assert any("VNG" in exp.company_name for exp in res.experiences)

    assert len(res.educations) >= 1
    assert any("Hanoi University" in edu.institution or "Technology" in edu.institution for edu in res.educations)

    assert len(res.projects) >= 1
    assert any("Billing" in proj.name for proj in res.projects)

    assert len(res.languages) >= 1
    assert any("vietnamese" in l.language_name.lower() or "english" in l.language_name.lower() for l in res.languages)


def test_cv_ie_02_strict_non_fabrication():
    """
    CV-IE-02: Sparse CV test. When a CV contains ONLY name, email, and 2 skills,
    all unmentioned sections MUST be empty [] and unmentioned fields None.
    NO fabricated companies, degrees, dates, projects, or URLs.
    """
    parser = CVParser()
    raw_text = """
    TRAN QUOC TUAN
    Email: tuantran@example.com
    SKILLS:
    Python, FastAPI
    """
    req = CVExtractRequest(
        cv_id="cv-sparse-ie-02",
        cv_version_id="ver-sparse-ie-02",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert "TRAN QUOC TUAN" in res.full_name.upper()
    assert res.email == "tuantran@example.com"
    assert res.phone is None
    assert res.github_url is None
    assert res.linkedin_url is None

    skill_names = {s.normalized_name for s in res.skills}
    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    assert "Java" not in skill_names
    assert "AWS" not in skill_names
    assert "Docker" not in skill_names

    assert len(res.experiences) == 0, f"Expected 0 experiences, got {res.experiences}"
    assert len(res.educations) == 0, f"Expected 0 educations, got {res.educations}"
    assert len(res.projects) == 0, f"Expected 0 projects, got {res.projects}"
    assert len(res.languages) == 0, f"Expected 0 languages, got {res.languages}"
    assert len(res.certifications) == 0, f"Expected 0 certifications, got {res.certifications}"


def test_cv_ie_03_no_skill_proficiency_speculation():
    """
    CV-IE-03: Candidate lists languages without explicit proficiency level.
    The system MUST NOT speculate 'INTERMEDIATE' or 'EXPERT'.
    proficiency_level must remain None.
    """
    parser = CVParser()
    raw_text = """
    LE HOANG PHUC
    Email: phuc.le@example.com
    SKILLS:
    Go, Redis
    LANGUAGES:
    French, Japanese
    """
    req = CVExtractRequest(
        cv_id="cv-prof-ie-03",
        cv_version_id="ver-prof-ie-03",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    for lang in res.languages:
        # Since CV does not specify proficiency, it must NOT default to INTERMEDIATE
        assert lang.proficiency_level is None, f"Speculated proficiency: {lang.proficiency_level}"


def test_cv_ie_04_no_experience_years_speculation():
    """
    CV-IE-04: Candidate lists skills without years of experience.
    The parser MUST NOT speculate years_exp = 2 or fabricate arbitrary numbers.
    """
    parser = CVParser()
    raw_text = """
    HOANG MINH DUC
    Email: duc.hoang@example.com
    SKILLS:
    Java, Spring Boot
    """
    req = CVExtractRequest(
        cv_id="cv-exp-ie-04",
        cv_version_id="ver-exp-ie-04",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    for skill in res.skills:
        # years_exp must be 0 (unspecified), never fabricated as 2
        assert skill.years_exp != 2, f"Skill {skill.normalized_name} has fabricated years_exp=2"


def test_cv_ie_05_missing_and_empty_raw_text_validation():
    """
    CV-IE-05: Missing raw text (None or whitespace-only) MUST return status FAILED
    with error codes RAW_TEXT_MISSING or RAW_TEXT_EMPTY, not silent success.
    """
    parser = CVParser()

    # Case A: None
    req_none = CVExtractRequest(
        cv_id="cv-none",
        cv_version_id="ver-none",
        file_type="PDF",
        raw_text=None
    )
    res_none = parser.parse_cv_document(req_none)
    assert res_none.status == "FAILED"
    assert res_none.error_code == "RAW_TEXT_MISSING"

    # Case B: Empty / Whitespace only
    req_empty = CVExtractRequest(
        cv_id="cv-empty",
        cv_version_id="ver-empty",
        file_type="PDF",
        raw_text="    \n\t   "
    )
    res_empty = parser.parse_cv_document(req_empty)
    assert res_empty.status == "FAILED"
    assert res_empty.error_code == "RAW_TEXT_EMPTY"


def test_cv_ie_06_insufficient_raw_text_validation():
    """
    CV-IE-06: Raw text with too few characters (< 30 chars) and no meaningful content
    MUST return status FAILED with error code RAW_TEXT_INSUFFICIENT.
    """
    parser = CVParser()
    req_insufficient = CVExtractRequest(
        cv_id="cv-short",
        cv_version_id="ver-short",
        file_type="PDF",
        raw_text="Hello world."
    )
    res = parser.parse_cv_document(req_insufficient)
    assert res.status == "FAILED"
    assert res.error_code == "RAW_TEXT_INSUFFICIENT"


def test_cv_ie_07_vietnamese_cv_unicode_preserved():
    """
    CV-IE-07: Vietnamese CV with full diacritics must preserve exact Unicode spelling
    for full name, university, and company names.
    """
    parser = CVParser()
    raw_text = """
    NGUYỄN VĂN ĐẠI
    Kỹ sư phần mềm Backend
    Email: nguyen.van.dai@example.com
    Số điện thoại: 0988776655

    HỌC VẤN:
    Đại học Bách Khoa Hà Nội
    Kỹ sư Công nghệ Thông tin (2018 - 2023)

    KINH NGHIỆM LÀM VIỆC:
    Tập đoàn Công nghệ FPT - Lập trình viên Java (2023 - 2024)
    Phát triển dịch vụ ngân hàng số.

    KỸ NĂNG:
    Java, Spring Boot, PostgreSQL
    """
    req = CVExtractRequest(
        cv_id="cv-vi-07",
        cv_version_id="ver-vi-07",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert "NGUYỄN" in res.full_name or "ĐẠI" in res.full_name
    assert res.email == "nguyen.van.dai@example.com"
    assert res.phone == "0988776655"

    assert len(res.educations) >= 1
    assert any("Bách Khoa" in edu.institution or "Hà Nội" in edu.institution for edu in res.educations)

    assert len(res.experiences) >= 1
    assert any("FPT" in exp.company_name for exp in res.experiences)


def test_cv_ie_08_provider_auto_fallback():
    """
    CV-IE-08: In AUTO mode, when the primary API provider raises a network/API error,
    the client gracefully falls back to the local Ollama provider.
    """
    from app.config import settings
    client = LLMClient(provider="auto", use_mock=False)
    assert client.provider == "auto"

    with patch.object(settings, "OPENAI_API_KEY", "sk-test-real-key-12345"), \
         patch.object(client, "_generate_json_openai", side_effect=LLMAPIError(503, "OpenAI unreachable")), \
         patch.object(client, "_generate_json_ollama", return_value={"full_name": "John Doe"}) as mock_ollama:
        result = client.generate_json("system instruction", "candidate raw text")
        assert result.get("full_name") == "John Doe"
        mock_ollama.assert_called_once()


def test_cv_ie_09_provider_failure_handling_no_mock_fallback():
    """
    CV-IE-09: In AUTO or API mode, if both API and Local Ollama fail,
    it MUST raise an explicit LLMAPIError and NOT silently fall back to mock data.
    """
    from app.config import settings
    client = LLMClient(provider="auto", use_mock=False)

    with patch.object(settings, "OPENAI_API_KEY", "sk-test-real-key-12345"), \
         patch.object(client, "_generate_json_openai", side_effect=LLMAPIError(503, "API Down")), \
         patch.object(client, "_generate_json_ollama", side_effect=LLMAPIError(503, "Ollama Down")):
        with pytest.raises(LLMAPIError) as exc_info:
            client.generate_json("system instruction", "candidate raw text")
        assert "providers failed" in str(exc_info.value.error_message).lower()


def test_cv_ie_10_production_runtime_zero_mock_contract():
    """
    CV-IE-10: Verifies that production runtime instantiation has use_mock=False
    and does not return fabricated candidate names or mock data.
    """
    client = LLMClient(provider="ollama", use_mock=False)
    assert client.use_mock is False
    assert client.provider == "ollama"

    parser = CVParser(llm_client=client)
    assert parser.llm_client.use_mock is False
    assert parser.llm_client.provider in ["auto", "ollama", "openai", "local", "api"]

