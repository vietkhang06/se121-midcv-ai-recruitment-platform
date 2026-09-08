"""
REAL LLM SMOKE TEST SCRIPT
This script performs a strict live LLM smoke test against OpenAI API.
When USE_MOCK_LLM=false, it strictly validates live API connectivity.
NEVER FALLS BACK TO MOCK ON FAILURE.

USAGE:
    python scripts/real_llm_smoke_test.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.llm_client import LLMClient, LLMAPIError
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest

def run_real_llm_smoke_test():
    api_key = settings.OPENAI_API_KEY
    model = settings.OPENAI_MODEL

    print("=== STARTING REAL LLM SMOKE TEST ===")
    print(f"MODEL={model}")

    if not api_key or api_key == "mock-openai-key":
        print("[ERROR] OPENAI_API_KEY is not set or using placeholder key.")
        print("REAL LLM TEST FAILED")
        sys.exit(1)

    # Strictly enforce real LLM with use_mock=False
    llm_client = LLMClient(model_name=model, use_mock=False)

    try:
        # 1. Real JD Extraction Smoke Test
        print("\n--- Testing Live JD Extraction via OpenAI ---")
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
        print("\n--- Testing Live CV Extraction via OpenAI ---")
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

        cv_res = cv_parser.parse_cv_document(cv_req)
        print(f"Status: {cv_res.status}")
        print(f"Candidate Name: {cv_res.full_name}")
        print("Parsed Skills:")
        for s in cv_res.skills:
            print(f"  - {s.normalized_name} (Section: {s.section})")

        print("\n==========================================")
        print("REAL LLM TEST PASSED")
        print("==========================================")
        sys.exit(0)

    except LLMAPIError as api_err:
        print("\n==========================================")
        print("REAL LLM TEST FAILED")
        print("==========================================")
        print(f"HTTP {api_err.status_code}")
        print(f"error.type={api_err.error_type}")
        print(f"error.code={api_err.error_code}")
        print(f"error.message={api_err.error_message}")
        if api_err.request_id:
            print(f"request_id={api_err.request_id}")

        print("\n--- DIAGNOSIS ---")
        if api_err.status_code == 429:
            if api_err.error_code == "credit_balance_exhausted":
                print("Exact Reason: credit_balance_exhausted (OpenAI prepaid credit balance is 0. Add credits at https://platform.openai.com/settings/organization/billing/).")
            elif api_err.error_code == "insufficient_quota" or "quota" in (api_err.error_message or "").lower():
                print("Exact Reason: insufficient_quota (Account has exceeded its quota or has no available credit/billing).")
            elif api_err.error_code == "rate_limit_exceeded" or "rate limit" in (api_err.error_message or "").lower():
                print("Exact Reason: rate_limit_exceeded (Request rate or token per minute limit reached).")
            elif api_err.error_code == "project_spend_limit_exceeded":
                print("Exact Reason: project_spend_limit_exceeded (OpenAI Project spending limit reached).")
            elif api_err.error_code == "organization_usage_limit_exceeded":
                print("Exact Reason: organization_usage_limit_exceeded (Organization monthly limit exceeded).")
            else:
                print(f"Exact Reason: HTTP 429 (error.code={api_err.error_code}, error.type={api_err.error_type})")
        else:
            print(f"HTTP error: {api_err.status_code} - {api_err.error_message}")

        sys.exit(1)

    except Exception as e:
        print("\n==========================================")
        print("REAL LLM TEST FAILED")
        print("==========================================")
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_real_llm_smoke_test()
