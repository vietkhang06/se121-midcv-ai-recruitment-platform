"""M03: evaluate the actual authenticated backend ranking, never a second scoring engine.

Run with MIDCV_EVAL_TOKEN in the process environment (not on the command line).
Dataset: {"provenance":"...", "job_id":"...", "relevance":{"candidate UUID":0..3}}
"""
import argparse
import datetime
import json
import os
from pathlib import Path
import sys
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.evaluation.quality_metrics import ranking_metrics


def collect_predictions(base_url, job_id, token):
    rows, pages = [], []
    with httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {token}"}, timeout=30) as client:
        for page in range(1000):
            response = client.get(f"/api/v1/matching/jobs/{job_id}/rankings", params={"page": page, "size": 100})
            response.raise_for_status()
            data = response.json()["data"]
            pages.append(data)
            rows.extend(data["content"])
            if page + 1 >= data["totalPages"]:
                return rows, pages
    raise ValueError("Ranking pagination exceeded its safety bound")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True, type=Path)
    parser.add_argument("--base-url", default="http://127.0.0.1:8080")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    token = os.environ.get("MIDCV_EVAL_TOKEN")
    if not token:
        parser.error("MIDCV_EVAL_TOKEN is required; no fabricated predictions will be generated")
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    if not dataset.get("provenance"):
        parser.error("Independent label provenance must be recorded")
    rows, pages = collect_predictions(args.base_url, dataset["job_id"], token)
    ids = [str(row["candidateId"]) for row in rows]
    if any(not row.get("matchingAlgorithmVersion") or row.get("overallScore") is None for row in rows):
        raise ValueError("Every prediction needs a product engine version and score")
    report = {"timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "source": "AUTHENTICATED_BACKEND", "base_url": args.base_url,
              "dataset": dataset, "raw_predictions": pages,
              "metrics": [ranking_metrics(ids, dataset["relevance"], k) for k in (3, 5, 10)]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
