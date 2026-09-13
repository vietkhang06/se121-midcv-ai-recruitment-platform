import json
import subprocess
import requests
import uuid
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8080"

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

def main():
    print("=================================================================")
    print("MIDCV COMPREHENSIVE END-TO-END DATA FLOW & PERSISTENCE AUDIT")
    print("=================================================================")

    timestamp = int(time.time())
    cand_email = f"cand_test_{timestamp}@midcv.vn"
    rec_email = f"rec_test_{timestamp}@midcv.vn"
    password = "SecurePassword123!"

    # -------------------------------------------------------------
    # 1. CANDIDATE -> REGISTER THẬT -> POSTGRESQL users & candidate_profiles
    # -------------------------------------------------------------
    print("\n[STEP 1] Candidate Register...")
    reg_cand_payload = {
        "email": cand_email,
        "password": password,
        "fullName": f"Nguyen Van Thuc {timestamp}",
        "age": 25,
        "targetIndustry": "Technology",
        "targetIndustries": ["Technology", "Finance"]
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/register/candidate", json=reg_cand_payload)
    print(f"Status: {r.status_code}")
    res_data = r.json()
    assert r.status_code == 201, f"Failed: {r.text}"
    cand_token = res_data["data"]["devVerificationToken"]
    print(f"Verification token: {cand_token}")

    # Verify PostgreSQL users
    db_users = query_postgres(f"SELECT id, email, role, is_active, email_verified FROM users WHERE email = '{cand_email}'")
    print(f"DB users row: {db_users}")
    assert len(db_users) == 1, "User not in PostgreSQL!"
    cand_user_id = db_users[0].split('|')[0]

    # Verify PostgreSQL candidate_profiles
    db_cand_profiles = query_postgres(f"SELECT id, user_id, full_name, target_industry FROM candidate_profiles WHERE user_id = '{cand_user_id}'")
    print(f"DB candidate_profiles row: {db_cand_profiles}")
    assert len(db_cand_profiles) == 1, "CandidateProfile not in PostgreSQL!"
    cand_profile_id = db_cand_profiles[0].split('|')[0]

    # Verify email
    r = requests.post(f"{BASE_URL}/api/v1/auth/verify-email", json={"token": cand_token})
    assert r.status_code == 200, f"Verify email failed: {r.text}"
    db_verified = query_postgres(f"SELECT email_verified FROM users WHERE email = '{cand_email}'")[0]
    print(f"DB email_verified after verification: {db_verified}")
    assert db_verified == "t", "email_verified is not true in PostgreSQL!"

    # -------------------------------------------------------------
    # 2. CANDIDATE -> LOGIN THẬT -> JWT THẬT
    # -------------------------------------------------------------
    print("\n[STEP 2] Candidate Login...")
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": cand_email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    cand_jwt = r.json()["data"]["accessToken"]
    print(f"Candidate JWT (first 40 chars): {cand_jwt[:40]}...")
    cand_headers = {"Authorization": f"Bearer {cand_jwt}"}

    # -------------------------------------------------------------
    # 3. CANDIDATE -> UPLOAD CV THẬT -> POSTGRESQL cvs / cv_versions / cv_sections
    # -------------------------------------------------------------
    print("\n[STEP 3] Candidate Upload CV...")
    cv_payload = {
        "title": f"Senior Java Microservices Engineer CV {timestamp}",
        "creationPath": "BUILDER",
        "targetIndustry": "Technology",
        "rawText": "Chuyên gia phát triển phần mềm Backend với 4 năm kinh nghiệm Java 17, Spring Boot, PostgreSQL, Docker, Kafka, Redis, Microservices.",
        "isDefault": True
    }
    r = requests.post(f"{BASE_URL}/api/v1/candidate/cvs", headers=cand_headers, json=cv_payload)
    assert r.status_code == 201, f"Create CV failed: {r.text}"
    cv_id = r.json()["data"]["id"]
    print(f"Created CV ID: {cv_id}")

    # Verify PostgreSQL cvs
    db_cvs = query_postgres(f"SELECT id, candidate_id, title, status FROM cvs WHERE id = '{cv_id}'")
    print(f"DB cvs row: {db_cvs}")
    assert len(db_cvs) == 1, "CV not found in cvs table!"

    # Verify PostgreSQL cv_versions
    db_versions = query_postgres(f"SELECT id, cv_id, version_number, title FROM cv_versions WHERE cv_id = '{cv_id}'")
    print(f"DB cv_versions row: {db_versions}")
    assert len(db_versions) >= 1, "CVVersion not found in cv_versions table!"
    cv_version_id = db_versions[0].split('|')[0]

    # Verify PostgreSQL cv_sections
    db_sections = query_postgres(f"SELECT id, cv_version_id, section_type, substring(content, 1, 40) FROM cv_sections WHERE cv_version_id = '{cv_version_id}'")
    print(f"DB cv_sections row: {db_sections}")
    assert len(db_sections) >= 1, "CVSection not found in cv_sections table!"

    # -------------------------------------------------------------
    # 4. RECRUITER -> REGISTER/LOGIN THẬT -> TẠO JOB THẬT -> POSTGRESQL jobs / job_requirements
    # -------------------------------------------------------------
    print("\n[STEP 4] Recruiter Register & Create Job...")
    reg_rec_payload = {
        "email": rec_email,
        "password": password,
        "fullName": f"HR Manager {timestamp}",
        "companyName": f"TechCorp Global {timestamp}",
        "companyTaxCode": f"TAX-{timestamp}",
        "companyWebsite": "https://techcorp.example.com",
        "companyIndustry": "Technology"
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/register/recruiter", json=reg_rec_payload)
    assert r.status_code == 201, f"Recruiter register failed: {r.text}"
    rec_token = r.json()["data"]["devVerificationToken"]

    # Verify email
    requests.post(f"{BASE_URL}/api/v1/auth/verify-email", json={"token": rec_token})

    # Login recruiter
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": rec_email, "password": password})
    assert r.status_code == 200, f"Recruiter login failed: {r.text}"
    rec_jwt = r.json()["data"]["accessToken"]
    rec_headers = {"Authorization": f"Bearer {rec_jwt}"}
    print(f"Recruiter JWT: {rec_jwt[:40]}...")

    # Verify Recruiter & Company in PostgreSQL
    db_rec_users = query_postgres(f"SELECT id, email, role FROM users WHERE email = '{rec_email}'")
    rec_user_id = db_rec_users[0].split('|')[0]
    db_rec_profiles = query_postgres(f"SELECT id, company_id FROM recruiter_profiles WHERE user_id = '{rec_user_id}'")
    company_id = db_rec_profiles[0].split('|')[1]
    print(f"Recruiter User ID: {rec_user_id}, Company ID: {company_id}")

    # Update company to VERIFIED so job can be published
    query_postgres(f"UPDATE companies SET verification_status = 'VERIFIED' WHERE id = '{company_id}'")

    # Create Draft Job
    job_payload = {
        "title": f"Senior Java Backend Engineer {timestamp}",
        "industry": "Technology",
        "seniority": "Senior",
        "location": "Ho Chi Minh City",
        "employmentType": "FULL_TIME",
        "minSalary": 2500,
        "maxSalary": 4000,
        "description": "Tuyển dụng kỹ sư Backend chuyên sâu Java, Spring Boot, PostgreSQL, Kafka.",
        "requirements": [
            {"skillName": "Java", "type": "REQUIRED", "minYearsExp": 3},
            {"skillName": "Spring Boot", "type": "REQUIRED", "minYearsExp": 2},
            {"skillName": "PostgreSQL", "type": "REQUIRED", "minYearsExp": 2},
            {"skillName": "Kafka", "type": "PREFERRED", "minYearsExp": 1}
        ]
    }
    r = requests.post(f"{BASE_URL}/api/v1/jobs/draft", headers=rec_headers, json=job_payload)
    assert r.status_code == 201, f"Create job draft failed: {r.text}"
    job_id = r.json()["data"]["id"]
    print(f"Created Job ID: {job_id}")

    # Publish Job
    r = requests.post(f"{BASE_URL}/api/v1/jobs/{job_id}/publish", headers=rec_headers)
    assert r.status_code == 200, f"Publish job failed: {r.text}"
    print(f"Published Job Status: {r.json()['data']['status']}")

    # Verify PostgreSQL jobs table
    db_jobs = query_postgres(f"SELECT id, title, company_id, status FROM jobs WHERE id = '{job_id}'")
    print(f"DB jobs row: {db_jobs}")
    assert len(db_jobs) == 1 and "PUBLISHED" in db_jobs[0], "Job not published in PostgreSQL!"

    # Verify PostgreSQL job_requirements table
    db_reqs = query_postgres(f"SELECT id, skill_name, requirement_type, min_years_exp FROM job_requirements WHERE job_id = '{job_id}'")
    print(f"DB job_requirements rows ({len(db_reqs)}): {db_reqs}")
    assert len(db_reqs) == 4, f"Expected 4 job requirements in DB, found {len(db_reqs)}"

    # -------------------------------------------------------------
    # 5. CANDIDATE -> APPLY JOB THẬT -> POSTGRESQL applications -> application_cv_version_id
    # -------------------------------------------------------------
    print("\n[STEP 5] Candidate Apply Job...")
    apply_payload = {
        "jobId": job_id,
        "cvId": cv_id
    }
    r = requests.post(f"{BASE_URL}/api/v1/candidate/applications", headers=cand_headers, json=apply_payload)
    assert r.status_code == 201, f"Apply job failed: {r.text}"
    app_id = r.json()["data"]["id"]
    print(f"Submitted Application ID: {app_id}")

    # Verify PostgreSQL applications & application_cv_version_id
    db_apps = query_postgres(f"SELECT id, job_id, candidate_id, applied_cv_id, applied_cv_version_id, status FROM applications WHERE id = '{app_id}'")
    print(f"DB applications row: {db_apps}")
    assert len(db_apps) == 1, "Application not in PostgreSQL!"
    parts = db_apps[0].split('|')
    applied_ver_id = parts[4]
    print(f"Persisted applied_cv_version_id: {applied_ver_id}")
    assert applied_ver_id != "", "applied_cv_version_id is NULL in PostgreSQL!"

    # Verify PostgreSQL application_cv_snapshots
    db_snapshots = query_postgres(f"SELECT id, application_id, cv_title FROM application_cv_snapshots WHERE application_id = '{app_id}'")
    print(f"DB application_cv_snapshots row: {db_snapshots}")
    assert len(db_snapshots) == 1, "Snapshot not in PostgreSQL!"

    # -------------------------------------------------------------
    # 6. RECRUITER -> XEM APPLICATION -> DỮ LIỆU LẤY TỪ POSTGRESQL
    # -------------------------------------------------------------
    print("\n[STEP 6] Recruiter fetches applications for Job...")
    r = requests.get(f"{BASE_URL}/api/v1/recruiter/jobs/{job_id}/applications", headers=rec_headers)
    assert r.status_code == 200, f"Recruiter fetch applications failed: {r.text}"
    rec_apps = r.json()["data"]
    print(f"Applications returned to Recruiter: {len(rec_apps)}")
    assert len(rec_apps) == 1, "Recruiter did not receive the application!"
    assert rec_apps[0]["id"] == app_id, "Application ID mismatch!"
    assert rec_apps[0]["candidateName"] == reg_cand_payload["fullName"]
    print(f"Recruiter received Candidate Name: {rec_apps[0]['candidateName']}")

    # -------------------------------------------------------------
    # 7. MATCHING -> CHẠY THẬT -> match_results, match_factors, evidences
    # -------------------------------------------------------------
    print("\n[STEP 7] Verifying Matching Engine & PostgreSQL persistence...")
    # Trigger/Fetch Inspection
    r = requests.get(f"{BASE_URL}/api/v1/matching/applications/{app_id}/inspection", headers=rec_headers)
    assert r.status_code == 200, f"Fetch inspection failed: {r.text}"
    insp_data = r.json()["data"]
    print(f"Inspection Overall Score: {insp_data.get('overallScore')}")
    print(f"Inspection Core Score: {insp_data.get('coreScore')}")

    # Verify PostgreSQL match_results
    db_match = query_postgres(f"SELECT id, application_id, core_score, overall_score, status, required_skills_matched FROM match_results WHERE application_id = '{app_id}'")
    print(f"DB match_results row: {db_match}")
    assert len(db_match) == 1, "match_results row not found in PostgreSQL!"
    match_result_id = db_match[0].split('|')[0]

    # Verify PostgreSQL match_factors
    db_factors = query_postgres(f"SELECT id, factor_type, factor_name, score, weight FROM match_factors WHERE match_result_id = '{match_result_id}'")
    print(f"DB match_factors rows ({len(db_factors)}):")
    for f in db_factors:
        print(f"   -> {f}")
    assert len(db_factors) >= 3, f"Expected match_factors, found {len(db_factors)}"

    # Verify PostgreSQL evidences
    db_evidences = query_postgres(f"SELECT id, source_type, section, substring(snippet, 1, 60), validation_status FROM evidences WHERE match_result_id = '{match_result_id}'")
    print(f"DB evidences rows ({len(db_evidences)}):")
    for ev in db_evidences:
        print(f"   -> {ev}")
    assert len(db_evidences) >= 1, f"Expected evidences in PostgreSQL, found {len(db_evidences)}"

    # -------------------------------------------------------------
    # 8. BROWSER B -> LOGIN CÙNG TÀI KHOẢN -> NHÌN THẤY ĐÚNG DỮ LIỆU BROWSER A
    # -------------------------------------------------------------
    print("\n[STEP 8] Cross-Session / Browser B Persistence Test...")
    # Browser B (Completely separate session / headers / storage):
    session_b = requests.Session() # fresh cookies/session
    r_login_b = session_b.post(f"{BASE_URL}/api/v1/auth/login", json={"email": cand_email, "password": password})
    assert r_login_b.status_code == 200, f"Browser B login failed: {r_login_b.text}"
    jwt_b = r_login_b.json()["data"]["accessToken"]
    headers_b = {"Authorization": f"Bearer {jwt_b}"}

    # Browser B queries CVs
    r_cvs_b = session_b.get(f"{BASE_URL}/api/v1/candidate/cvs", headers=headers_b)
    assert r_cvs_b.status_code == 200
    cvs_b = r_cvs_b.json()["data"]
    print(f"Browser B fetched {len(cvs_b)} CV(s). First CV ID: {cvs_b[0]['id']}")
    assert cvs_b[0]["id"] == cv_id, "Browser B did not see the exact CV from Browser A!"
    assert cvs_b[0]["title"] == cv_payload["title"], "CV title mismatch in Browser B!"

    # Browser B queries Applications
    r_apps_b = session_b.get(f"{BASE_URL}/api/v1/candidate/applications", headers=headers_b)
    assert r_apps_b.status_code == 200
    apps_b = r_apps_b.json()["data"]
    print(f"Browser B fetched {len(apps_b)} Application(s). First App ID: {apps_b[0]['id']}")
    assert apps_b[0]["id"] == app_id, "Browser B did not see the exact Application from Browser A!"
    assert apps_b[0]["appliedCvId"] == cv_id, "Applied CV ID mismatch in Browser B!"

    print("\n=================================================================")
    print("ALL 8 PIPELINE PHASES VERIFIED WITH 100% PERSISTENCE IN POSTGRESQL!")
    print("=================================================================")

if __name__ == "__main__":
    main()
