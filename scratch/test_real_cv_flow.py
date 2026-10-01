import json
import time
import uuid
import requests
import subprocess
import os

BASE_URL = "http://localhost:8080"
AI_WORKER_URL = "http://localhost:8000"

def query_postgres(sql):
    cmd = [
        "docker", "exec", "airecruit-postgres-pgvector",
        "psql", "-U", "postgres", "-d", "airecruit_db",
        "-t", "-A", "-F", "|", "-c", sql
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        raise RuntimeError(f"Postgres query failed: {res.stderr}")
    return [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]

def run_real_cv_flow_test():
    print("=" * 70)
    print("STARTING REAL UPLOAD-TO-REVIEW FLOW INTEGRATION TEST")
    print("=" * 70)

    # 1. Health checks
    print("\n[STEP 1] Checking Service Health...")
    r_backend = requests.get(f"{BASE_URL}/api/v1/jobs")
    assert r_backend.status_code == 200, f"Backend not ready: {r_backend.status_code}"
    print("  -> Backend (8080): OK")

    r_ai = requests.get(f"{AI_WORKER_URL}/internal/ai/health")
    assert r_ai.status_code == 200, f"AI Worker not ready: {r_ai.status_code}"
    print("  -> AI Worker (8000): OK")

    pg_check = query_postgres("SELECT 1;")
    assert pg_check == ["1"], "PostgreSQL not ready"
    print("  -> PostgreSQL (5432): OK")

    # 2. Register Candidate
    print("\n[STEP 2] Registering Test Candidate...")
    timestamp = int(time.time())
    email = f"real_test_{timestamp}@midcv.vn"
    password = "TestPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": f"Nguyen Van RealTest {timestamp}",
        "age": 26,
        "targetIndustry": "Technology",
        "targetIndustries": ["Technology"]
    }
    r_reg = requests.post(f"{BASE_URL}/api/v1/auth/register/candidate", json=reg_payload)
    assert r_reg.status_code == 201, f"Candidate registration failed: {r_reg.text}"
    token = r_reg.json()["data"]["devVerificationToken"]

    r_ver = requests.post(f"{BASE_URL}/api/v1/auth/verify-email", json={"token": token})
    assert r_ver.status_code == 200, f"Email verification failed: {r_ver.text}"

    # 3. Login
    print("\n[STEP 3] Logging In Candidate...")
    r_login = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": email, "password": password})
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    jwt_token = r_login.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {jwt_token}"}
    print("  -> Candidate authenticated, JWT obtained.")

    # 4. Upload CV
    print("\n[STEP 4] POST /api/v1/candidate/cvs/upload (Real PDF)...")
    cv_file_path = "test-fixtures/synthetic/01_single_column_tech_cv.pdf"
    assert os.path.exists(cv_file_path), f"File not found: {cv_file_path}"

    with open(cv_file_path, "rb") as f:
        files = {"file": ("01_single_column_tech_cv.pdf", f, "application/pdf")}
        data = {"title": "Fullstack Java Resume", "targetIndustry": "Technology", "isDefault": "true"}
        r_upload = requests.post(f"{BASE_URL}/api/v1/candidate/cvs/upload", headers=headers, files=files, data=data)

    print(f"  -> Upload HTTP Status Code: {r_upload.status_code}")
    assert r_upload.status_code == 202, f"Expected 202 Accepted, got {r_upload.status_code}: {r_upload.text}"

    upload_data = r_upload.json()["data"]
    cv_id = upload_data.get("cvId") or upload_data.get("id")
    version_id = upload_data.get("versionId")
    job_id = upload_data.get("jobId")

    print(f"  -> Returned cvId: {cv_id}")
    print(f"  -> Returned versionId: {version_id}")
    print(f"  -> Returned jobId: {job_id}")

    assert cv_id is not None, "cvId is None"
    assert version_id is not None, "versionId is None"
    assert job_id is not None, "jobId is None"

    # 5. Verify ID contract in PostgreSQL
    print("\n[STEP 5] Verifying ID Contract in PostgreSQL...")
    doc_rows = query_postgres(f"SELECT id FROM documents WHERE id = '{cv_id}'")
    cv_rows = query_postgres(f"SELECT id FROM cvs WHERE id = '{cv_id}'")
    print(f"  -> documents.id matches: {doc_rows}")
    print(f"  -> cvs.id matches: {cv_rows}")
    assert len(doc_rows) == 1 and doc_rows[0] == cv_id, f"documents.id mismatch: {doc_rows}"
    assert len(cv_rows) == 1 and cv_rows[0] == cv_id, f"cvs.id mismatch: {cv_rows}"
    print("  [PASS] documents.id == cvs.id (CANONICAL ID PRESERVED)")

    doc_ver_rows = query_postgres(f"SELECT id FROM document_versions WHERE id = '{version_id}'")
    cv_ver_rows = query_postgres(f"SELECT id FROM cv_versions WHERE id = '{version_id}'")
    print(f"  -> document_versions.id matches: {doc_ver_rows}")
    print(f"  -> cv_versions.id matches: {cv_ver_rows}")
    assert len(doc_ver_rows) == 1 and doc_ver_rows[0] == version_id, f"document_versions.id mismatch: {doc_ver_rows}"
    assert len(cv_ver_rows) == 1 and cv_ver_rows[0] == version_id, f"cv_versions.id mismatch: {cv_ver_rows}"
    print("  [PASS] document_versions.id == cv_versions.id (CANONICAL VERSION ID PRESERVED)")

    job_rows = query_postgres(f"SELECT id, entity_id, state, step, progress FROM processing_jobs WHERE id = '{job_id}'")
    print(f"  -> processing_jobs row: {job_rows}")
    assert len(job_rows) == 1, "Job not found in DB"
    job_parts = job_rows[0].split('|')
    assert job_parts[1] == version_id, f"Job entity_id {job_parts[1]} does not match versionId {version_id}"
    print("  [PASS] processing_jobs.entity_id == versionId")

    # 6. Polling processing-status
    print("\n[STEP 6] Polling GET /api/v1/candidate/cvs/{cvId}/processing-status...")
    terminal_status = None
    attempts = 0
    max_attempts = 45

    while attempts < max_attempts:
        time.sleep(1)
        attempts += 1
        r_status = requests.get(f"{BASE_URL}/api/v1/candidate/cvs/{cv_id}/processing-status", headers=headers)
        assert r_status.status_code == 200, f"Polling returned {r_status.status_code} (CRITICAL: 404 NOT ALLOWED): {r_status.text}"

        status_body = r_status.json()["data"]
        curr_state = status_body.get("status")
        curr_stage = status_body.get("stage")
        curr_progress = status_body.get("progress")
        print(f"  [Attempt {attempts:02d}] status={curr_state}, stage={curr_stage}, progress={curr_progress}%")

        if curr_state in ["COMPLETED", "SUCCEEDED", "FAILED"]:
            terminal_status = status_body
            break

    print(f"\nTerminal Polling Result: {json.dumps(terminal_status, indent=2)}")
    assert terminal_status is not None, "Polling timed out before terminal state"
    assert terminal_status.get("status") in ["COMPLETED", "SUCCEEDED", "FAILED"], f"Unexpected terminal status: {terminal_status}"

    # 7. Check single worker & review endpoint
    print("\n[STEP 7] Verifying Worker Execution & Review State...")
    events = query_postgres(f"SELECT step, code, message FROM job_events WHERE job_id = '{job_id}' ORDER BY created_at ASC")
    print("  -> Job Events:")
    for ev in events:
        print(f"     {ev}")

    if terminal_status.get("status") in ["COMPLETED", "SUCCEEDED"]:
        print("\n[STEP 8] LLM Succeeded -> Calling GET /api/v1/candidate/cvs/{cvId}/review...")
        r_review = requests.get(f"{BASE_URL}/api/v1/candidate/cvs/{cv_id}/review", headers=headers)
        print(f"  -> Review HTTP Status: {r_review.status_code}")
        assert r_review.status_code == 200, f"Review failed: {r_review.text}"
        review_data = r_review.json()["data"]
        print(f"  -> Review CV Title: {review_data.get('title')}")
        print(f"  -> Review Extracted Raw Text length: {len(review_data.get('rawText') or '')}")
        print("  [PASS] Review endpoint returned 200 with draft data!")
    else:
        print("\n[STEP 8] LLM Failed as expected when LLM provider unavailable:")
        print(f"  -> Error Code: {terminal_status.get('errorCode')}")
        print(f"  -> Message: {terminal_status.get('message')}")
        print(f"  -> CorrelationId: {terminal_status.get('correlationId')}")
        assert terminal_status.get("errorCode") is not None, "Error code missing on failure"
        print("  [PASS] Failure contract enforced properly!")

    print("\n" + "=" * 70)
    print("REAL UPLOAD-TO-REVIEW FLOW TEST COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_real_cv_flow_test()
