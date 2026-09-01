import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.services.normalizer import normalize_skill_name

def test_extraction_precision_recall_f1_metrics():
    """
    Evaluates extraction quality (Precision, Recall, F1) against ground-truth benchmarks.
    """
    jd_parser = JDParser()
    cv_parser = CVParser()

    # Ground-truth Java JD requirements
    jd_desc = """
    Requirements (Required):
    - 3+ years experience with Java and Spring Framework microservices.
    - PostgreSQL database design and queries.

    Preferred:
    - Docker containerization.
    - AWS cloud experience.
    """
    jd_req = JDExtractRequest(
        job_id="job-quality-01",
        title="Senior Java Developer",
        industry="Technology",
        raw_description=jd_desc
    )
    jd_res = jd_parser.parse_job_description(jd_req)

    ground_truth_required = {"Java", "Spring Boot", "PostgreSQL"}

    extracted_req = {s.normalized_name for s in jd_res.required_skills}

    # Precision, Recall, F1 for Required Skills
    tp_req = len(extracted_req.intersection(ground_truth_required))
    precision_req = tp_req / len(extracted_req) if extracted_req else 1.0
    recall_req = tp_req / len(ground_truth_required) if ground_truth_required else 1.0
    f1_req = 2 * (precision_req * recall_req) / (precision_req + recall_req) if (precision_req + recall_req) > 0 else 0.0

    assert precision_req >= 0.80, f"Expected Required Skill Precision >= 0.80, got {precision_req}"
    assert recall_req >= 0.80, f"Expected Required Skill Recall >= 0.80, got {recall_req}"
    assert f1_req >= 0.80, f"Expected Required Skill F1 >= 0.80, got {f1_req}"

    # CV Extraction Test
    cv_text = """
    Nguyen Van Java
    Email: java.dev@example.com
    GitHub: https://github.com/candidate-java
    
    Work Experience:
    Senior Software Engineer - FPT (2021 - Present)
    - Developed Java & Spring Boot microservices with PostgreSQL database.
    - Utilized Docker and Redis for caching.
    """
    cv_req = CVExtractRequest(
        cv_id="cv-quality-01",
        cv_version_id="cv-ver-01",
        candidate_id="cand-quality-01",
        file_type="PDF",
        raw_text=cv_text
    )
    cv_res = cv_parser.parse_cv_document(cv_req)

    assert cv_res.status == "SUCCESS"
    assert cv_res.contact_info.email == "java.dev@example.com" if hasattr(cv_res, "contact_info") and cv_res.contact_info else True
    assert cv_res.github_url == "https://github.com/candidate-java"
    
    extracted_cv_skills = {s.normalized_name for s in cv_res.skills}
    assert "Java" in extracted_cv_skills
    assert "Spring Boot" in extracted_cv_skills

def test_normalization_accuracy():
    test_cases = [
        ("SpringBoot", "Spring Boot"),
        ("Postgres", "PostgreSQL"),
        ("TS", "TypeScript"),
        ("JS", "JavaScript"),
        ("k8s", "Kubernetes"),
    ]
    correct = 0
    for original, expected in test_cases:
        if normalize_skill_name(original) == expected:
            correct += 1
    accuracy = correct / len(test_cases)
    assert accuracy == 1.0, f"Expected 100% normalization accuracy, got {accuracy}"
