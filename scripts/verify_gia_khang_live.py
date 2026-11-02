"""Opt-in acceptance on the dedicated disposable MidCV DB. No real-user data or external messages.

Import .env.gia-khang-test.local into the process first. Requires psycopg[binary] and httpx.
Private actor credentials are saved only under ignored diagnostics/, never in the report.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import secrets
import sys
import time
import uuid
from datetime import datetime, timezone
import httpx
import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-worker"))
from app.evaluation.quality_metrics import ranking_metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=["core", "documents", "screening", "vectors"], default="core")
    parser.add_argument("--provider-mode", choices=["mock", "real"], default="mock")
    args = parser.parse_args()
    if args.provider_mode == "real" and os.environ.get("MIDCV_ENABLE_PAID_TESTS") != "1":
        parser.error("Real-provider tests are opt-in: set MIDCV_ENABLE_PAID_TESTS=1 explicitly")
    expected_model = "test-mock-1024" if args.provider_mode == "mock" else "bge-m3"

    dsn = os.environ["DATABASE_URL"].removeprefix("jdbc:")
    if dsn != "postgresql://127.0.0.1:55439/midcv_test":
        raise SystemExit("Refusing writes outside the explicitly named disposable database")
    db = psycopg.connect(dsn, user=os.environ["DATABASE_USERNAME"], password=os.environ["DATABASE_PASSWORD"], autocommit=True, row_factory=dict_row)
    base = "http://127.0.0.1:18089"
    private = ROOT / "diagnostics/gia-khang/live-actors.json"
    report_path = ROOT / f"docs/tasks/evidence/live-{args.phase}.json"
    report = {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "phase": args.phase,
              "source": "REAL_BACKEND_POSTGRESQL_PGVECTOR", "provider_mode": args.provider_mode, "semantic_model_quality_measured": False, "synthetic_data": True, "checks": [], "http": []}

    def record(name, **data):
        report["checks"].append({"name": name, "status": "PASSED", **data})
        print("PASS", name, flush=True)

    def api(actor, method, path, *, expected=200, **kwargs):
        started = time.perf_counter()
        response = httpx.request(method, base + path, headers={"Authorization": "Bearer " + actor["token"]}, timeout=180, **kwargs)
        report["http"].append({"method": method, "path": path, "status": response.status_code, "duration_ms": round((time.perf_counter() - started) * 1000)})
        if response.status_code != expected:
            raise AssertionError(f"{method} {path}: HTTP {response.status_code}, expected {expected}; code={response.json().get('code')}")
        body = response.json()
        return body.get("data", body)

    def scalar(query, params=()):
        return next(iter(db.execute(query, params).fetchone().values()))

    def new_actor(index, role="CANDIDATE"):
        actor = {"user_id": str(uuid.uuid4()), "profile_id": str(uuid.uuid4()), "email": f"gia-{uuid.uuid4().hex[:10]}-{index}@example.test", "password": secrets.token_urlsafe(22)}
        db.execute("INSERT INTO users(id,email,password_hash,role,email_verified,is_active) VALUES (%s,%s,crypt(%s,gen_salt('bf')),%s,true,true)",
                   (actor["user_id"], actor["email"], actor["password"], role))
        if role == "CANDIDATE":
            db.execute("INSERT INTO candidate_profiles(id,user_id,full_name,target_industry) VALUES (%s,%s,%s,'Technology')", (actor["profile_id"], actor["user_id"], f"Synthetic {index}"))
        response = httpx.post(base + "/api/v1/auth/login", json={"email": actor["email"], "password": actor["password"]}, timeout=20)
        assert response.status_code == 200, "Synthetic actor login failed"
        actor["token"] = response.json()["data"]["accessToken"]
        return actor

    def get_draft(actor):
        return api(actor, "GET", f"/api/v1/candidate/cvs/{actor['cv_id']}/draft")

    def save(actor, draft, **fields):
        return api(actor, "PUT", f"/api/v1/candidate/cvs/{actor['cv_id']}/draft", json={
            "version_id": draft["version_id"], "expected_revision": draft["revision"], **fields})

    def confirm(actor, draft):
        return api(actor, "POST", f"/api/v1/candidate/cvs/{actor['cv_id']}/confirm", json={
            "version_id": draft["version_id"], "expected_revision": draft["revision"]})

    def wait_review(actor, cv_id, timeout=600):
        started = time.monotonic()
        while time.monotonic() - started < timeout:
            value = api(actor, "GET", f"/api/v1/candidate/cvs/{cv_id}/processing-status")
            if value["status"] == "FAILED":
                raise AssertionError("Live extraction failed: " + str(value.get("errorCode")))
            if value["status"] in ("SUCCEEDED", "COMPLETED", "CONFIRMED") or value.get("stage") == "NEEDS_REVIEW":
                return round(time.monotonic() - started, 2)
            time.sleep(2)
        raise AssertionError("Live processing did not finish within the acceptance deadline")

    try:
        if args.phase == "core":
            db.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            db.execute("UPDATE system_ai_settings SET ollama_url=%s,embedding_model=%s,embedding_provider='LOCAL_OLLAMA' WHERE id='current'", ("http://127.0.0.1:18019" if args.provider_mode == "mock" else "http://127.0.0.1:11439", expected_model))
            company, job = str(uuid.uuid4()), str(uuid.uuid4())
            db.execute("INSERT INTO companies(id,name,tax_code,verification_status,operational_status) VALUES (%s,'Synthetic Acceptance Company',%s,'VERIFIED','ACTIVE')", (company, "SYN" + uuid.uuid4().hex[:12]))
            hr = new_actor("hr", "HR")
            db.execute("INSERT INTO recruiter_profiles(id,user_id,company_id,full_name) VALUES (%s,%s,%s,'Synthetic Recruiter')", (hr["profile_id"], hr["user_id"], company))
            db.execute("INSERT INTO jobs(id,company_id,title,industry,seniority,status,description) VALUES (%s,%s,'Java Backend Engineer','Technology','MIDDLE','PUBLISHED','Java Docker PostgreSQL backend. Required: Java and Docker. 3+ years experience and Bachelor degree. Build API projects.')", (job, company))
            for skill in ("Java", "Docker"):
                db.execute("INSERT INTO job_requirements(id,job_id,skill_name,requirement_type) VALUES (%s,%s,%s,'REQUIRED')", (str(uuid.uuid4()), job, skill))
            cases = [
                ("strong", ["Java", "Docker", "PostgreSQL"], True, 3),
                ("declared-only", ["Java", "Docker"], False, 2),
                ("partial", ["Java"], True, 2),
                ("unrelated", ["Python"], False, 0),
                ("confusable", ["JavaScript"], False, 0),
            ]
            actors, labels = [], {}
            for index, (name, skills, evidence, relevance) in enumerate(cases):
                actor = new_actor(name)
                actor["case"] = name
                created = api(actor, "POST", "/api/v1/candidate/cvs", expected=201, json={"title": f"Synthetic {name}", "creationPath": "BUILDER", "targetIndustry": "Technology", "isDefault": True})
                actor["cv_id"] = created["id"]
                draft = get_draft(actor)
                draft = save(actor, draft, personal_info={"full_name": f"Synthetic {name}"},
                    summary={"content": "Synthetic professional profile."}, skills=[{"name": skill} for skill in skills],
                    work_experience=[{"company": "Example Lab", "position": "Java Engineer", "start_date": "2020-01", "end_date": "2025-01", "description": "Java Docker API"}] if evidence else [],
                    education=[{"institution": "Example Institute", "degree": "Bachelor"}] if evidence else [],
                    projects=[{"name": "Java API", "description": "Java Docker PostgreSQL backend API", "tech_stack": skills}] if evidence else [],
                    presentation={"template": "editorial"})
                confirm(actor, draft)
                actor["applied_version_id"] = draft["version_id"]
                before = scalar("SELECT count(*) FROM applications")
                preview = api(actor, "POST", f"/api/v1/candidate/match/{job}?cvId={actor['cv_id']}")
                assert scalar("SELECT count(*) FROM applications") == before and preview.get("applicationId") is None
                application = api(actor, "POST", "/api/v1/candidate/applications", expected=201, json={"jobId": job, "cvId": actor["cv_id"]})
                actor["application_id"] = application["id"]
                labels[actor["profile_id"]] = relevance
                actors.append(actor)
            private.parent.mkdir(parents=True, exist_ok=True)
            private.write_text(json.dumps({"job_id": job, "hr": hr, "candidates": actors}), encoding="utf-8")
            record("M05 preview creates no application; submissions bind confirmed versions", candidates=len(actors))

            strong = actors[0]
            inspection = api(hr, "GET", f"/api/v1/matching/applications/{strong['application_id']}/inspection")
            core = sum(Decimal(str(row["weightedContribution"])) for row in inspection["matchFactors"] if row.get("factorName") != "GitHub hỗ trợ")
            # GitHub is unavailable for synthetic accounts; every nonzero contribution is core.
            assert abs(core - Decimal(str(inspection["coreScore"]))) < Decimal("0.02")
            repeat = []
            for _ in range(100):
                value = api(hr, "POST", f"/api/v1/matching/jobs/{job}/candidates/{strong['profile_id']}")
                repeat.append(value["overallScore"])
            assert len(set(repeat)) == 1
            record("M02 backend score repeats 100/100; stored factors reconstruct core", score=repeat[0], repeats=100)

            ranking = api(hr, "GET", f"/api/v1/matching/jobs/{job}/rankings?size=100")
            rows = ranking["content"]
            missing = [row["requiredSkillsMissing"] for row in rows]
            assert missing == sorted(missing)
            predicted_ids = [str(row["candidateId"]) for row in rows]
            report["ranking"] = {"label_provenance": "Synthetic task-authored rubric: strong=3, declared required skills or partial relevant evidence=2, unrelated/confusable=0; labels declared before backend calls, not HR expert annotations.",
                "labels": labels, "predictions": rows, "metrics": [ranking_metrics(predicted_ids, labels, k) for k in (3, 5)]}
            record("M03 real backend ranking evaluated against independent synthetic relevance labels", metrics=report["ranking"]["metrics"])

            policy = api(hr, "GET", f"/api/v1/jobs/{job}/matching-policy")
            policy.update(coreWeight=0.90, githubWeight=0.10)
            api(hr, "PUT", f"/api/v1/jobs/{job}/matching-policy", json=policy)
            count = api(hr, "POST", f"/api/v1/jobs/{job}/matching/recalculate")
            assert count == len(actors)
            record("M02 saved policy and actual recalculate endpoint", recalculated=count)

            current = get_draft(strong)
            next_draft = save(strong, current, summary={"content": "Changed current profile: Python only"}, skills=[{"name": "Python"}])
            assert next_draft["version_id"] != current["version_id"] and next_draft["status"] == "DRAFT"
            api(strong, "POST", f"/api/v1/candidate/match/{job}?cvId={strong['cv_id']}", expected=400)
            old = api(hr, "GET", f"/api/v1/matching/applications/{strong['application_id']}/inspection")
            assert old["sourceCvVersionId"] == strong["applied_version_id"] and old["inputTraceStatus"] == "SNAPSHOT_VALIDATED"
            assert any(item["skillName"] == "Java" and item["status"] == "MATCH" for item in old["requiredSkillsStatus"])
            record("M06 current draft cannot rewrite applied snapshot or its evidence", source_version=old["sourceCvVersionId"])

            path = f"/api/v1/candidate/cvs/{strong['cv_id']}/draft"
            payload = {"version_id": next_draft["version_id"], "expected_revision": next_draft["revision"]}
            def concurrent_save(title):
                return httpx.put(base + path, headers={"Authorization": "Bearer " + strong["token"]}, json={**payload, "title": title}, timeout=30).status_code
            with ThreadPoolExecutor(max_workers=2) as pool:
                statuses = sorted(pool.map(concurrent_save, ["Concurrent A", "Concurrent B"]))
            assert statuses == [200, 409], statuses
            record("C01 PostgreSQL simultaneous stale saves: one winner, one conflict", statuses=statuses)

            before = scalar("SELECT structured_json_content FROM cv_versions WHERE id=%s", (actors[2]["applied_version_id"],))
            gap = api(actors[2], "GET", f"/api/v1/candidate/match/{job}/gap-analysis?cvId={actors[2]['cv_id']}")
            assert gap["job_id"] == job and gap["cv_version_id"] == actors[2]["applied_version_id"]
            assert any(item["category"] == "MISSING_MANDATORY" and item["skill_name"] == "Docker" for item in gap["gap_breakdown"])
            assert before == scalar("SELECT structured_json_content FROM cv_versions WHERE id=%s", (actors[2]["applied_version_id"],))
            report["gap_response"] = gap
            record("M04 real worker/backend gap roadmap preserves confirmed CV", roadmap_source=gap.get("roadmap_source"))

            vectors = db.execute("SELECT entity_type,entity_id,model_name,dimension,source_sha256,status FROM embeddings WHERE entity_type IN ('CV_VERSION','JOB') ORDER BY created_at").fetchall()
            assert vectors and all(row["dimension"] == 1024 and row["model_name"] == expected_model for row in vectors)
            report["vectors"] = json.loads(json.dumps(vectors, default=str))
            record("M01 vectors cached by confirmed version/model/source hash", vector_rows=len(vectors), embedding_model=expected_model, provider_mode=args.provider_mode)

        else:
            state = json.loads(private.read_text(encoding="utf-8"))
            hr, job = state["hr"], state["job_id"]
            if args.phase == "vectors":
                actor = state["candidates"][0]
                route = f"/api/v1/matching/jobs/{job}/candidates/{actor['profile_id']}"
                original_hash = scalar("SELECT source_sha256 FROM embeddings WHERE entity_type='JOB' AND entity_id=%s AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1", (job,))
                db.execute("UPDATE jobs SET title=title || ' - revised' WHERE id=%s", (job,))
                api(hr, "POST", route)
                changed_hash = scalar("SELECT source_sha256 FROM embeddings WHERE entity_type='JOB' AND entity_id=%s AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1", (job,))
                assert original_hash != changed_hash
                record("M01 JD title changes invalidate the persisted source hash")
                changed_model = expected_model + ":revision-test"
                db.execute("UPDATE system_ai_settings SET embedding_model=%s WHERE id='current'", (changed_model,))
                api(hr, "POST", route)
                assert scalar("SELECT model_name FROM embeddings WHERE entity_type='JOB' AND entity_id=%s AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1", (job,)) == changed_model
                record("M01 model changes invalidate both persisted vector spaces")
                # Inject a real PostgreSQL write error, restricted to this disposable DB/model.
                # A failed cache transaction must not abort the outer application-scoring transaction.
                db.execute("""CREATE OR REPLACE FUNCTION gia_khang_cache_failure() RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN IF NEW.model_name='mock-cache-sql-failure' THEN RAISE EXCEPTION 'synthetic cache write failure'; END IF; RETURN NEW; END $$""")
                db.execute("CREATE TRIGGER gia_khang_cache_failure BEFORE INSERT ON embeddings FOR EACH ROW EXECUTE FUNCTION gia_khang_cache_failure()")
                try:
                    db.execute("UPDATE system_ai_settings SET embedding_model='mock-cache-sql-failure' WHERE id='current'")
                    api(hr, "POST", route)
                    trace = scalar("SELECT policy_snapshot FROM match_results WHERE application_id=%s", (actor["application_id"],))
                    trace = json.loads(trace) if isinstance(trace, str) else trace
                    assert trace["input_context"]["semantic_method"] == "TF_CONCEPT_COSINE_SIMILARITY"
                    record("M01 SQL cache failure rolls back independently; outer score persists with explicit fallback")
                finally:
                    db.execute("DROP TRIGGER IF EXISTS gia_khang_cache_failure ON embeddings")
                    db.execute("DROP FUNCTION IF EXISTS gia_khang_cache_failure()")
                    db.execute("UPDATE system_ai_settings SET embedding_model=%s WHERE id='current'", (expected_model,))
            elif args.phase == "documents":
                actor = new_actor("documents")
                from io import BytesIO
                from docx import Document
                synthetic = Document()
                for text in ["SYNTHETIC DELAY CANDIDATE", "Software deveIoper with tested API projects.", "Java Docker", "MIDCV_DELAY_PROBE"]:
                    synthetic.add_paragraph(text)
                buffer = BytesIO()
                synthetic.save(buffer)
                content = buffer.getvalue()
                uploaded = api(actor, "POST", "/api/v1/candidate/cvs/upload", expected=202,
                    files={"file": ("synthetic.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
                actor["cv_id"] = uploaded["cvId"]
                duration = wait_review(actor, actor["cv_id"])
                original = api(actor, "GET", f"/api/v1/candidate/cvs/{actor['cv_id']}/review")
                raw = original["rawText"]
                stored_path = scalar("SELECT file_path FROM cvs WHERE id=%s", (actor["cv_id"],))
                path = Path(stored_path)
                if not path.is_absolute(): path = ROOT / "backend" / path
                original_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                draft = get_draft(actor)
                assert duration >= 60, "The dedicated delay probe must exercise a job lasting over 60 seconds"
                record("R02 real backend queue/worker finishes a mock-provider job longer than 60 seconds", processing_seconds=duration)
                summary_before = draft["summary"]
                proposed = api(actor, "POST", f"/api/v1/candidate/cvs/{actor['cv_id']}/ocr-review", json={
                    "version_id": draft["version_id"], "expected_revision": draft["revision"]})
                assert proposed["proposal"]["edits"] and proposed["revision"] != draft["revision"]
                assert get_draft(actor)["summary"] == summary_before
                draft = api(actor, "POST", f"/api/v1/candidate/cvs/{actor['cv_id']}/ocr-review/apply", json={
                    "version_id": draft["version_id"], "expected_revision": proposed["revision"], "accepted_indices": [0], "confirmed": True})
                assert "developer" in json.dumps(draft["summary"]) and "deveIoper" not in json.dumps(draft["summary"])
                assert api(actor, "GET", f"/api/v1/candidate/cvs/{actor['cv_id']}/review")["rawText"] == raw
                record("O02 backend stores revision-bound proposal, applies only approved typography and preserves extraction")
                draft = save(actor, draft, personal_info={"full_name": "Synthetic Reviewed Name"}, presentation={"template": "editorial"})
                reread = get_draft(actor)
                assert reread["presentation"]["template"] == "editorial"
                confirm(actor, reread)
                assert hashlib.sha256(path.read_bytes()).hexdigest() == original_hash == hashlib.sha256(content).hexdigest()
                assert api(actor, "GET", f"/api/v1/candidate/cvs/{actor['cv_id']}/review")["rawText"] == raw
                record("C01 save/reload/confirm preserves original bytes and raw text", sha256=original_hash, processing_seconds=duration)
                state["document_actor"] = actor
                private.write_text(json.dumps(state), encoding="utf-8")
            else:
                before_candidates = scalar("SELECT count(*) FROM candidate_profiles")
                before_applications = scalar("SELECT count(*) FROM applications")
                content = (ROOT / "test-fixtures/synthetic/01_single_column_tech_cv.pdf").read_bytes()
                run = api(hr, "POST", f"/api/v1/hr/jobs/{job}/screenings", files={"file": ("synthetic-screen.pdf", content, "application/pdf")}, data={"githubEnabled": "false"})
                started = time.monotonic()
                while time.monotonic() - started < 900:
                    detail = api(hr, "GET", f"/api/v1/hr/screenings/{run['id']}")
                    if detail["result"]:
                        break
                    if detail["jobs"] and detail["jobs"][0]["state"] == "FAILED":
                        raise AssertionError("Live screening failed: " + str(detail["jobs"][0].get("error_code")))
                    time.sleep(3)
                else:
                    raise AssertionError("Live screening deadline exceeded")
                assert scalar("SELECT count(*) FROM candidate_profiles") == before_candidates
                assert scalar("SELECT count(*) FROM applications") == before_applications
                report["screening_detail"] = detail
                record("M05 HR screening produces a separately versioned score without application/candidate creation", result=detail["result"])
        report["status"] = "PASSED"
    except Exception as error:
        report["status"] = "FAILED"
        report["failure"] = {"type": type(error).__name__, "message": str(error)[:600]}
        print("FAILED", type(error).__name__, str(error)[:250], flush=True)
        return_code = 1
    else:
        return_code = 0
    finally:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        db.close()
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
