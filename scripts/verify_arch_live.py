"""Collect and validate one real Candidate -> HR matching result.

Requires an already submitted application, an HR access token, psql access to the
same PostgreSQL database, and a screenshot from the actual HR browser session.
No fixture data or mock service is created here.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.request import Request, urlopen
from uuid import UUID


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--application-id", required=True)
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--screenshot", required=True, type=Path)
    parser.add_argument("--before-json", type=Path,
                        help="Earlier inspection response for the same application, captured before vectors were ready")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    app_id = str(UUID(args.application_id))
    token = os.getenv("MIDCV_HR_TOKEN")
    require(token, "Set MIDCV_HR_TOKEN to a real recruiter access token")
    require(args.screenshot.is_file() and args.screenshot.stat().st_size > 1000,
            "Provide the real HR browser screenshot showing this application")

    url = args.base_url.rstrip("/") + f"/api/v1/matching/applications/{app_id}/inspection"
    with urlopen(Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}),
                 timeout=30) as response:
        http_status = response.status
        payload = json.load(response)
    require(http_status == 200, f"Inspection HTTP status: {http_status}")
    inspection = payload.get("data", payload)
    require(inspection.get("applicationId") == app_id, "HTTP application ID mismatch")

    sql = f"""SELECT row_to_json(e) FROM (
      SELECT a.id AS application_id, a.status AS application_status,
        a.applied_cv_version_id AS applied_cv_version_id,
        a.applied_jd_version_id AS applied_jd_version_id,
        m.status AS calculation_status, m.semantic_method, m.embedding_model,
        m.cv_version_id, m.jd_version_id, m.overall_score,
        cv.state AS cv_state, jd.state AS jd_state,
        cv.embedding_model AS cv_model, jd.embedding_model AS jd_model,
        cv.embedding_dimension AS cv_dimension, jd.embedding_dimension AS jd_dimension,
        cv.embedding_source_sha AS cv_vector_sha, jd.embedding_source_sha AS jd_vector_sha,
        jd.source_sha AS jd_source_sha,
        cv.embedding IS NOT NULL AS cv_has_vector, jd.embedding IS NOT NULL AS jd_has_vector,
        greatest(0,least(100,(1-(cv.embedding <=> jd.embedding))*100)) AS pgvector_score,
        (SELECT count(*) FROM match_factors f WHERE f.match_result_id=m.id) AS factor_count
      FROM applications a
      JOIN match_results m ON m.application_id=a.id
      JOIN document_versions cv ON cv.id=a.applied_cv_version_id
      JOIN document_versions jd ON jd.id=a.applied_jd_version_id
      WHERE a.id='{app_id}'
    ) e;"""
    db = subprocess.run(["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
                        capture_output=True, text=True, check=True)
    rows = [line for line in db.stdout.splitlines() if line.strip()]
    require(len(rows) == 1, "Expected exactly one application/result/vector pair in DB")
    row = json.loads(rows[0])
    require(str(row["application_id"]) == app_id, "DB application ID mismatch")
    require(inspection.get("calculationStatus") == row["calculation_status"] == "PGVECTOR_READY",
            "Pgvector result is not ready in both HTTP and DB")
    require(inspection.get("semanticMethod") == row["semantic_method"] == "PGVECTOR_COSINE_SIMILARITY",
            "Actual semantic method is not pgvector")
    require(inspection.get("embeddingModel") == row["embedding_model"] == row["cv_model"] == row["jd_model"],
            "CV/JD/result model mismatch")
    require(row["cv_dimension"] == row["jd_dimension"] == 1024, "Vector dimension mismatch")
    require(row["cv_state"] == row["jd_state"] == "READY" and row["cv_has_vector"] and row["jd_has_vector"],
            "One of the pinned vectors is missing")
    require(row["cv_vector_sha"] and row["jd_vector_sha"] == row["jd_source_sha"],
            "Vector source hash mismatch")
    require(str(row["applied_cv_version_id"]) == str(row["cv_version_id"]) == inspection.get("cvVersionId"),
            "CV snapshot version mismatch")
    require(str(row["applied_jd_version_id"]) == str(row["jd_version_id"]) == inspection.get("jdVersionId"),
            "JD snapshot version mismatch")
    require(row["pgvector_score"] is not None and row["factor_count"] > 0,
            "SQL <=> or scoring evidence is missing")
    if args.before_json:
        before_payload = json.loads(args.before_json.read_text(encoding="utf-8"))
        before = before_payload.get("data", before_payload)
        require(before.get("applicationId") == app_id, "Earlier application ID mismatch")
        require(before.get("calculationStatus") in {"PENDING_VECTOR", "FALLBACK_USED"},
                "Earlier response does not prove a provisional result")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "inspection.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output_dir / "database.json").write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {"application_id": app_id, "http_status": http_status, "pgvector_sql_score": row["pgvector_score"],
              "screenshot_sha256": hashlib.sha256(args.screenshot.read_bytes()).hexdigest(),
              "screenshot_path": str(args.screenshot), "before_vector_captured": bool(args.before_json),
              "result": "PGVECTOR_LIVE_VERIFIED"}
    (args.output_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as error:
        print(f"ARCH live verification failed: {error}", file=sys.stderr)
        sys.exit(1)
