"""HTTP integration against the local worker + local synthetic provider; no paid APIs.

Start gia_khang_mock_provider.py and point all worker providers to localhost:18019.
This validates transport/contracts, not semantic model quality.
"""
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:18009/internal/ai"


def main():
    report = {"timestamp_utc": datetime.now(timezone.utc).isoformat(),
              "provider_mode": "LOCAL_SYNTHETIC_MOCK", "checks": []}
    def post(path, data, expected=200):
        response = httpx.post(BASE + path, json=data, timeout=100)
        assert response.status_code == expected, (path, response.status_code, response.text[:200])
        return response.json()
    def passed(name, **evidence):
        report["checks"].append({"name": name, "status": "PASSED", **evidence})
        print("PASS", name, flush=True)
    try:
        raw = "Software deveIoper with tested API projects. Java Docker."
        proposal = post("/cv/ocr-review", {"raw_text": raw})
        assert proposal["source_sha256"] == hashlib.sha256(raw.encode()).hexdigest()
        assert proposal["edits"][0]["before"] == "deveIoper"
        assert proposal["model"] == "mock-contract-model"
        applied = post("/cv/ocr-review/apply", {"raw_text": raw, "proposal": proposal,
                       "accepted_indices": [0], "confirmed": True})
        assert applied["corrected_text"] == raw.replace("deveIoper", "developer")
        rejected = post("/cv/ocr-review/apply", {"raw_text": raw, "proposal": proposal,
                        "accepted_indices": [], "confirmed": True})
        assert rejected["corrected_text"] == raw
        post("/cv/ocr-review/apply", {"raw_text": raw + " changed", "proposal": proposal,
             "accepted_indices": [0], "confirmed": True}, 409)
        post("/cv/ocr-review/apply", {"raw_text": raw, "proposal": proposal,
             "accepted_indices": [0], "confirmed": False}, 422)
        unsafe = json.loads(json.dumps(proposal))
        unsafe["edits"][0]["after"] = "Kubernetes"
        post("/cv/ocr-review/apply", {"raw_text": raw, "proposal": unsafe,
             "accepted_indices": [0], "confirmed": True}, 409)
        passed("O02 HTTP proposal/apply/reject/stale/unconfirmed/unsafe", model=proposal["model"])
        gap = post("/matching/skill-gap-and-roadmap", {
            "candidate_skills": ["Java"], "jd_required_skills": ["Java", "Docker"],
            "jd_preferred_skills": ["PostgreSQL"], "target_job_title": "Java engineer"})
        assert any(x["skill_name"] == "Docker" and x["category"] == "MISSING_MANDATORY" for x in gap["gap_breakdown"])
        assert gap["tailored_roadmap"]
        no_gap = post("/matching/skill-gap-and-roadmap", {
            "candidate_skills": ["Java"], "jd_required_skills": ["Java"]})
        assert not no_gap["tailored_roadmap"]
        passed("M04 HTTP JD-specific gap/roadmap and no-gap behavior", source=gap["roadmap_source"])
        structured = post("/structure-cv", {"rawText": raw})
        assert structured["success"] and structured["providerUsed"] == "primary"
        fallback = post("/structure-cv", {"rawText": raw + " MOCK_PRIMARY_503"})
        assert fallback["success"] and fallback["fallbackUsed"] is True
        passed("L01 actual HTTP primary success and transient fallback", provider=fallback["providerUsed"])
        started = time.monotonic()
        delayed = post("/structure-cv", {"rawText": raw + " MIDCV_DELAY_PROBE"})
        elapsed = time.monotonic() - started
        assert delayed["success"] and elapsed >= 60, elapsed
        passed("R02 worker HTTP request completes after 60 seconds", duration_seconds=round(elapsed, 2))
        report["status"] = "PASSED"
    except Exception as error:
        report["status"] = "FAILED"
        report["failure"] = {"type": type(error).__name__, "message": str(error)[:500]}
        raise
    finally:
        output = ROOT / "docs/tasks/evidence/worker-http-mock.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
