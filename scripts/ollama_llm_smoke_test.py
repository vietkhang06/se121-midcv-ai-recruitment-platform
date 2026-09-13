"""
MidCV - Ollama LLM Smoke Test & Anti-Mock Verification Script
Product: MidCV
LLM Model: dna5rm/granite4.2:3b-8k
Provider: Ollama (http://localhost:11434)

Verifies:
1. Server connectivity
2. Live JD extraction
3. Live CV extraction
4. Anti-Mock verification (Senior Quantum-Inspired Warehouse Orchestration Engineer)
   Input: Rust, Apache Pulsar, Temporal.io, CockroachDB
   Fails if default fallback mock (Java, Spring Boot, PostgreSQL) is returned.

Exit code: 0 if all tests PASS, 1 if any test FAILS.
"""

import os
import sys
import time
from pathlib import Path

# Add ai-worker to sys.path
root_dir = Path(__file__).resolve().parent.parent
ai_worker_dir = root_dir / "ai-worker"
if ai_worker_dir.exists():
    sys.path.insert(0, str(ai_worker_dir))

import httpx
from app.config import settings
from app.services.llm_client import LLMClient, LLMAPIError
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest

def run_ollama_smoke_test():
    product = "MidCV"
    mode = "OLLAMA"
    model = settings.OLLAMA_MODEL
    base_url = settings.OLLAMA_BASE_URL

    print(f"PRODUCT={product}")
    print(f"MODE={mode}")
    print(f"MODEL={model}")

    # 1. Verify Server & Model availability
    try:
        resp = httpx.get(f"{base_url}/api/tags", timeout=10.0)
        if resp.status_code != 200:
            print("SERVER=FAIL")
            print("MODEL=FAIL")
            sys.exit(1)
        print("SERVER=PASS")

        data = resp.json()
        models = [m.get("name", "") for m in data.get("models", [])]
        if not any(model in m or m.startswith(model.split(":")[0]) for m in models):
            print(f"MODEL=FAIL (model {model} not found in {models})")
            sys.exit(1)
        print("MODEL=PASS")
    except Exception as e:
        print("SERVER=FAIL")
        print("MODEL=FAIL")
        print(f"[ERROR] Ollama connection error: {e}", file=sys.stderr)
        sys.exit(1)

    # Initialize live client (use_mock=False strictly enforced)
    llm_client = LLMClient(model_name=model, provider="ollama", use_mock=False)

    # 2. Live JD Extraction Test
    jd_status = "FAIL"
    try:
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
        req_names = [r.normalized_name.lower() for r in jd_res.required_skills]
        if any("java" in n for n in req_names):
            jd_status = "PASS"
            print("JD_EXTRACTION=PASS")
        else:
            print(f"JD_EXTRACTION=FAIL (Skills extracted: {req_names})")
    except Exception as e:
        print(f"JD_EXTRACTION=FAIL ({e})")

    # 3. Live CV Extraction Test
    cv_status = "FAIL"
    try:
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
        skill_names = [s.normalized_name.lower() for s in cv_res.skills]
        if any("java" in n for n in skill_names):
            cv_status = "PASS"
            print("CV_EXTRACTION=PASS")
        else:
            print(f"CV_EXTRACTION=FAIL (Skills extracted: {skill_names})")
    except Exception as e:
        print(f"CV_EXTRACTION=FAIL ({e})")

    # 4. Anti-Mock Test (Must reflect specialized inputs, NOT default Java/Spring seeds)
    anti_mock_status = "FAIL"
    try:
        specialized_jd = """
Job Title: Senior Quantum-Inspired Warehouse Orchestration Engineer
Industry: Technology / High-Concurrency Logistics

Mandatory Requirements:
- Hands-on distributed systems engineering with Rust.
- Event streaming infrastructure with Apache Pulsar.
- Durable workflow orchestration using Temporal.io.
- Distributed ACID transactional storage with CockroachDB.
        """
        anti_mock_req = JDExtractRequest(
            job_id="anti-mock-jd",
            title="Senior Quantum-Inspired Warehouse Orchestration Engineer",
            industry="Technology",
            raw_description=specialized_jd
        )
        anti_mock_res = jd_parser.parse_job_description(anti_mock_req)
        extracted_skills = [r.normalized_name.lower() for r in anti_mock_res.required_skills]
        raw_skill_strings = [r.skill_name.lower() for r in anti_mock_res.required_skills]
        all_skill_tokens = " ".join(extracted_skills + raw_skill_strings)

        # Anti-mock check: must NOT be generic mock (only Java/Spring Boot/PostgreSQL)
        has_rust = "rust" in all_skill_tokens
        has_pulsar = "pulsar" in all_skill_tokens
        has_temporal = "temporal" in all_skill_tokens
        has_cockroach = "cockroach" in all_skill_tokens

        # If it returned default Java mock without any input skills, it's fake!
        if (has_rust or has_pulsar or has_temporal or has_cockroach) and not (
            len(extracted_skills) == 3 and "java" in extracted_skills and "spring boot" in extracted_skills and not has_rust
        ):
            anti_mock_status = "PASS"
            print("ANTI_MOCK_TEST=PASS")
        else:
            print(f"ANTI_MOCK_TEST=FAIL (Detected static mock response: {extracted_skills})")
    except Exception as e:
        print(f"ANTI_MOCK_TEST=FAIL ({e})")

    # Final Evaluation
    if jd_status == "PASS" and cv_status == "PASS" and anti_mock_status == "PASS":
        print("\n==========================================")
        print("ALL MIDCV OLLAMA SMOKE TESTS PASSED")
        print("==========================================")
        sys.exit(0)
    else:
        print("\n==========================================")
        print("MIDCV OLLAMA SMOKE TEST FAILED")
        print("==========================================")
        sys.exit(1)

if __name__ == "__main__":
    run_ollama_smoke_test()
