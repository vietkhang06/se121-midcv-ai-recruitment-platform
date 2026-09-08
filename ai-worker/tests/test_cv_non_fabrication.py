import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.cv import CVExtractRequest
from app.services.cv_parser import CVParser

def test_rich_cv_high_fidelity_extraction():
    """
    CV-01: Verifies comprehensive schema extraction across all 6 core sections:
    Identity & Contact, Skills, Experience, Education, Projects, and Languages.
    """
    parser = CVParser()
    raw_text = """
TRAN VAN BACKEND
Senior Backend Engineer
Passionate software engineer with 5 years building scalable distributed microservices.
Email: tran.backend@example.com
Phone: 0901234567
GitHub: https://github.com/tran-backend
LinkedIn: https://linkedin.com/in/tran-backend

SKILLS:
Java, Spring Boot, PostgreSQL, Docker, Redis

WORK EXPERIENCE:
TechCorp Vietnam - Senior Backend Engineer (2021-01 - Present)
Led development of high-throughput payment processing microservices using Java and Spring Boot.

EDUCATION:
VNU-HCM University of Science
Bachelor of Science in Computer Science (2017 - 2021)

SELECTED PROJECTS:
E-commerce Core Engine
Role: Lead Architect
Developed order fulfillment pipeline using Spring Boot and Docker.

LANGUAGES:
English - ADVANCED
Vietnamese - NATIVE
"""
    req = CVExtractRequest(
        cv_id="cv-rich-01",
        cv_version_id="ver-rich-01",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert res.cv_id == "cv-rich-01"
    assert res.cv_version_id == "ver-rich-01"

    # 1. Identity & Contact Info
    assert "TRAN VAN BACKEND" in res.full_name.upper()
    assert res.email == "tran.backend@example.com"
    assert res.phone == "0901234567"
    assert res.github_url == "https://github.com/tran-backend"
    assert res.contact_info is not None
    assert res.contact_info.email == "tran.backend@example.com"

    # 2. Skills
    skill_names = {s.normalized_name for s in res.skills}
    assert "Java" in skill_names
    assert "Spring Boot" in skill_names
    assert "PostgreSQL" in skill_names
    assert "Docker" in skill_names

    # 3. Experiences
    assert len(res.experiences) >= 1
    exp = res.experiences[0]
    assert "TechCorp Vietnam" in exp.company_name
    assert "Backend" in exp.position

    # 4. Education
    assert len(res.educations) >= 1
    edu = res.educations[0]
    assert "University of Science" in edu.institution or "VNU-HCM" in edu.institution

    # 5. Projects
    assert len(res.projects) >= 1
    proj = res.projects[0]
    assert "E-commerce" in proj.name

    # 6. Languages
    assert len(res.languages) >= 1
    langs = {l.language_name.lower() for l in res.languages}
    assert "english" in langs or "vietnamese" in langs

    # 7. Evidences
    assert len(res.evidences) > 0


def test_sparse_cv_zero_fabrication_guarantee():
    """
    CV-02: Sparse CV test. When a CV contains ONLY name, email, and 3 skills,
    the parser MUST NOT fabricate work experiences, universities, degrees, projects,
    or languages. All unmentioned sections must be strictly empty [].
    """
    parser = CVParser()
    raw_text = """
LE MINH
Email: leminh.junior@example.com
SKILLS:
Python, React, SQL
"""
    req = CVExtractRequest(
        cv_id="cv-sparse-01",
        cv_version_id="ver-sparse-01",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert res.full_name is not None
    assert "LE MINH" in res.full_name.upper()
    assert res.email == "leminh.junior@example.com"

    # Skills should strictly be those mentioned in raw_text
    skill_norms = {s.normalized_name for s in res.skills}
    assert "Python" in skill_norms
    assert "React" in skill_norms
    assert "SQL" in skill_norms

    # STRICT ANTI-FABRICATION GUARANTEE:
    # No experiences, educations, projects, or languages should be invented!
    assert len(res.experiences) == 0, f"Expected 0 experiences for sparse CV, got: {res.experiences}"
    assert len(res.educations) == 0, f"Expected 0 educations for sparse CV, got: {res.educations}"
    assert len(res.projects) == 0, f"Expected 0 projects for sparse CV, got: {res.projects}"
    assert len(res.languages) == 0, f"Expected 0 languages for sparse CV, got: {res.languages}"
    assert res.github_url is None, f"Expected None for github_url when not in text, got: {res.github_url}"


def test_grounded_evidence_substring_guarantee():
    """
    CV-02: Verbatim substring guarantee. Every single snippet in res.evidences
    MUST be an exact substring of raw_text.
    """
    parser = CVParser()
    raw_text = """
DOAN QUANG HUY
Mobile Developer
Email: huy.doan@example.com
Phone: 0912345678

SKILLS
React, TypeScript, Node.js, SQL

EXPERIENCE
FinTech Hub - Mobile Engineer (2022 - 2024)
Built cross-platform interfaces using React and TypeScript.
"""
    req = CVExtractRequest(
        cv_id="cv-evidence-01",
        cv_version_id="ver-evidence-01",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert len(res.evidences) > 0

    for ev in res.evidences:
        assert ev.snippet in raw_text, (
            f"Evidence snippet '{ev.snippet}' is NOT an exact verbatim substring of raw_text!"
        )
        assert len(ev.snippet.strip()) > 0
        assert ev.section in ["SKILLS", "EXPERIENCE", "EDUCATION", "PROJECTS", "LANGUAGES", "GENERAL"]


def test_non_technical_domain_cv_no_hallucination():
    """
    CV-01 & CV-02: CV for a Marketing/Finance domain candidate.
    Must extract domain skills and NOT hallucinate software engineering skills (Java, Spring, Docker).
    """
    parser = CVParser()
    raw_text = """
PHAM THI HOA
Senior Digital Marketing Specialist
Email: hoa.marketing@example.com
Phone: 0987654321

SKILLS:
Facebook Ads, Google Analytics, Content Creation, Excel

WORK EXPERIENCE:
Media Star Agency - Performance Marketing Lead (2020 - 2024)
Managed performance marketing campaigns and optimized return on ad spend.
"""
    req = CVExtractRequest(
        cv_id="cv-marketing-01",
        cv_version_id="ver-marketing-01",
        file_type="PDF",
        raw_text=raw_text
    )
    res = parser.parse_cv_document(req)

    assert res.status == "SUCCESS"
    assert "PHAM THI HOA" in res.full_name.upper()

    extracted_skills = {s.normalized_name for s in res.skills}
    # Domain skills must be present
    assert any("Marketing" in s or "Facebook" in s or "Google Analytics" in s or "Excel" in s or "Content Creation" in s for s in extracted_skills)

    # Hallucinated tech skills MUST NOT be present
    assert "Java" not in extracted_skills
    assert "Spring Boot" not in extracted_skills
    assert "Docker" not in extracted_skills
    assert "Kubernetes" not in extracted_skills


def test_github_url_grounding():
    """
    CV-01: GitHub URL is extracted when present, and strictly None when absent.
    """
    parser = CVParser()

    # Case A: GitHub URL present
    cv_with_gh = """
VO HOANG LONG
Fullstack Developer
GitHub: https://github.com/longvh-code
Skills: Python, React
"""
    req_a = CVExtractRequest(cv_id="cva", cv_version_id="va", file_type="PDF", raw_text=cv_with_gh)
    res_a = parser.parse_cv_document(req_a)
    assert res_a.github_url == "https://github.com/longvh-code"

    # Case B: GitHub URL absent
    cv_without_gh = """
VO HOANG LONG
Fullstack Developer
Email: long@example.com
Skills: Python, React
"""
    req_b = CVExtractRequest(cv_id="cvb", cv_version_id="vb", file_type="PDF", raw_text=cv_without_gh)
    res_b = parser.parse_cv_document(req_b)
    assert res_b.github_url is None
