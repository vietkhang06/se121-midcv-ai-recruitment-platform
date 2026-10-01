import pytest
from app.schemas.cv import CVExtractRequest
from app.schemas.document import PageSegment
from app.services.cv_parser import CVParser


class MockInjectionLLM:
    """Mock LLM returning injected payload to test parser defenses."""
    def generate_json(self, system_instruction, user_content):
        return {
            "full_name": "Nguyen Real Candidate",
            "headline": "Software Engineer",
            "email": "candidate@example.com",
            "skills": [
                {"skill_name": "Python", "years_exp": 3, "section": "SKILLS"},
                {"skill_name": "HallucinatedQuantumAI", "years_exp": 5, "section": "SKILLS"}
            ],
            "experiences": [
                {"company_name": "FakeCorp International", "position": "VP Engineering", "start_date": "2020", "end_date": "2024", "technologies": ["BrainFuck"]}
            ],
            "educations": [],
            "languages": [
                {"language_name": "Vietnamese", "proficiency_level": "NATIVE"},
                {"language_name": "Klingon", "proficiency_level": "NATIVE"}
            ]
        }


def test_cv_prompt_injection_and_hallucination_defense():
    """
    Validates that:
    1. Hallucinated skills ('HallucinatedQuantumAI') not in raw text are filtered out of verified skills and flagged into unverified_facts.
    2. Hallucinated experiences ('FakeCorp International') not in raw text are rejected.
    3. Hallucinated languages ('Klingon') not in raw text are rejected.
    4. Verified skills ('Python') have grounded CVEvidence with verbatim snippet and locator.
    """
    raw_text = """
    NGUYEN REAL CANDIDATE
    Email: candidate@example.com
    Skills: Python, FastAPI
    Languages: Vietnamese
    """

    pages = [
        PageSegment(
            page_number=1,
            text=raw_text.strip(),
            raw_text=raw_text,
            method="pdf-native",
            used_ocr=False,
            start_char=0,
            end_char=len(raw_text.strip())
        )
    ]

    parser = CVParser(llm_client=MockInjectionLLM())
    req = CVExtractRequest(
        cv_id="cv-anti-fab-01",
        cv_version_id="ver-anti-fab-01",
        file_type="PDF",
        raw_text=raw_text
    )

    res = parser.parse_cv_document(req)
    assert res.status == "SUCCESS"

    # Only Python should be in verified skills
    skill_names = [s.skill_name for s in res.skills]
    assert "Python" in skill_names
    assert "HallucinatedQuantumAI" not in skill_names

    # Check unverified facts
    unverified_values = [f["value"] for f in res.unverified_facts]
    assert "HallucinatedQuantumAI" in unverified_values
    assert any("FakeCorp" in v for v in unverified_values)

    # Check that FakeCorp was NOT included in experiences
    assert len(res.experiences) == 0

    # Klingon was not in text, so it must not be in languages
    lang_names = [l.language_name for l in res.languages]
    assert "Vietnamese" in lang_names
    assert "Klingon" not in lang_names

    # Check grounded evidence
    python_evidence = [e for e in res.evidences if e.normalized_value == "Python"]
    assert len(python_evidence) == 1
    assert python_evidence[0].snippet in raw_text
    assert python_evidence[0].is_verified is True
    assert python_evidence[0].page_number == 1
