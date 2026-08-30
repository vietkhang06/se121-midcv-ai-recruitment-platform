"""
REAL LLM SMOKE TEST SCRIPT
This script performs a manual real LLM smoke test using OPENAI_API_KEY environment variable.
DO NOT COMMIT API KEYS TO GIT.

USAGE:
    $env:OPENAI_API_KEY="your-actual-api-key"
    python scripts/real_llm_smoke_test.py
"""

import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.llm_client import LLMClient
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest

def run_real_llm_smoke_test():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "mock-openai-key":
        print("[WARNING] OPENAI_API_KEY environment variable is not set. Skipping live LLM smoke test.")
        print("To run live smoke test: set OPENAI_API_KEY='sk-...' and re-run this script.")
        return

    print("=== STARTING REAL LLM SMOKE TEST (OPENAI GPT-4O-MINI) ===")
    llm_client = LLMClient(use_mock=False)
    
    # 1. Real JD Extraction Smoke Test
    jd_parser = JDParser(llm_client=llm_client)
    jd_req = JDExtractRequest(
        job_id="smoke-jd-01",
        title="Senior Java Developer",
        industry="Technology",
        raw_description="""
We are seeking a Senior Java Engineer.
Mandatory Requirements:
- At least 3 years experience with Java 21 and Spring Boot.
- Experience with PostgreSQL and Docker.

Nice to have:
- AWS Kubernetes experience.
- Spoken Languages: English (Fluent).
        """
    )
    
    print("\n--- Testing Live JD Extraction ---")
    jd_res = jd_parser.parse_job_description(jd_req)
    print(f"Status: {jd_res.status}")
    print(f"Seniority: {jd_res.seniority}")
    print("Required Skills:")
    for req in jd_res.required_skills:
        print(f"  - {req.normalized_name} (Section: {req.section}, Snippet: '{req.snippet}')")
    print("Preferred Skills:")
    for pref in jd_res.preferred_skills:
        print(f"  - {pref.normalized_name} (Section: {pref.section}, Snippet: '{pref.snippet}')")

    # 2. Real CV Extraction Smoke Test
    cv_parser = CVParser(llm_client=llm_client)
    cv_req = CVExtractRequest(
        cv_id="smoke-cv-01",
        cv_version_id="smoke-cv-ver-01",
        file_type="PDF",
        raw_text="""
NGUYEN VAN CANDIDATE
Email: candidate@example.com | Phone: +84901234567

TECHNICAL SKILLS
Java 21, Spring Boot, PostgreSQL, Docker

PROFESSIONAL EXPERIENCE
Senior Software Engineer at TechCorp Vietnam (2022 - Present)
- Developed microservices using Spring Boot 3 and Java 21.
        """
    )

    print("\n--- Testing Live CV Extraction ---")
    cv_res = cv_parser.parse_cv_document(cv_req)
    print(f"Status: {cv_res.status}")
    print(f"Candidate Name: {cv_res.full_name}")
    print("Parsed Skills:")
    for s in cv_res.skills:
        print(f"  - {s.normalized_name} (Section: {s.section})")

    print("\n=== REAL LLM SMOKE TEST COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_real_llm_smoke_test()
