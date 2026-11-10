#!/usr/bin/env python3
"""MID-07 metric calculator; consumes EXPORTED PRODUCTION SCORES and independent graded labels.

It never reimplements scoring. Missing ground truth or mismatched datasets causes failure.
JSONL prediction: case_id,candidate_id,method,score,policy_version,source='BACKEND_API'
JSONL label: case_id,candidate_id,relevance(0..3),dataset_version,annotator
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
import math
from pathlib import Path


def read_jsonl(path: str) -> list[dict]:
    result = []
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Malformed JSON line {number} in {path}: {exc}") from exc
        if not isinstance(data, dict):
            raise ValueError(f"Expected JSON object at line {number} in {path}")
        result.append(data)
    if not result:
        raise ValueError(f"Empty dataset: {path}")
    return result


def dcg(values: list[int], k: int) -> float:
    return sum((2**v - 1) / math.log2(i + 2) for i, v in enumerate(values[:k]))


def eval_case(predictions: list[tuple[str, float]], relevance: dict[str, int], k: int) -> dict:
    ranked = sorted(predictions, key=lambda x: (-x[1], x[0]))
    rels = [relevance[candidate] for candidate, _ in ranked]
    positives = sum(v > 0 for v in relevance.values())
    p = sum(v > 0 for v in rels[:k]) / k
    r = (sum(v > 0 for v in rels[:k]) / positives) if positives else 0.0
    best = dcg(sorted(relevance.values(), reverse=True), k)
    ndcg = dcg(rels, k) / best if best else 0.0
    ordered_score = dict(ranked)
    comparable = correct = 0
    ids = sorted(relevance)
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if relevance[a] == relevance[b]:
                continue
            comparable += 1
            if (relevance[a] - relevance[b]) * (ordered_score[a] - ordered_score[b]) > 0:
                correct += 1
    return {f"precision@{k}": p, f"recall@{k}": r, f"ndcg@{k}": ndcg,
            "pairwise_accuracy": correct / comparable if comparable else None,
            "pairwise_comparisons": comparable}


def evaluate(predicted: list[dict], labels: list[dict], k: int) -> dict:
    truth: dict[str, dict[str, int]] = defaultdict(dict)
    versions: set[str] = set()
    for row in labels:
        case, cand = str(row["case_id"]), str(row["candidate_id"])
        grade = row["relevance"]
        if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(4):
            raise ValueError(f"Invalid relevance grade for {case}/{cand}")
        if not row.get("dataset_version") or not row.get("annotator"):
            raise ValueError("Every ground-truth label requires dataset_version and annotator")
        if cand in truth[case]:
            raise ValueError(f"Duplicate label {case}/{cand}")
        truth[case][cand] = grade
        versions.add(str(row["dataset_version"]))
    if len(versions) != 1:
        raise ValueError("Mixed ground-truth dataset versions are not comparable")
    groups: dict[str, dict[str, list[tuple[str, float]]]] = defaultdict(lambda: defaultdict(list))
    for row in predicted:
        if row.get("source") != "BACKEND_API":
            raise ValueError("Predictions must be exported from actual production backend APIs")
        if not row.get("policy_version"):
            raise ValueError("Missing scoring policy version")
        case, cand, method = (str(row[k]) for k in ("case_id", "candidate_id", "method"))
        score = row["score"]
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score):
            raise ValueError("Non-finite or nonnumeric score")
        if cand not in truth.get(case, {}):
            raise ValueError(f"No independent label for {case}/{cand}")
        if any(c == cand for c, _ in groups[method][case]):
            raise ValueError(f"Duplicate prediction {method}/{case}/{cand}")
        groups[method][case].append((cand, float(score)))
    if not groups:
        raise ValueError("No production ranking predictions")
    report = {"type": "OFFLINE_METRICS_FROM_PRODUCTION_EXPORT", "dataset_version": next(iter(versions)),
              "created_at": datetime.now(timezone.utc).isoformat(), "k": k, "methods": {}}
    required_cases = set(truth)
    for method, cases in groups.items():
        if set(cases) != required_cases:
            raise ValueError(f"Method {method} does not cover the complete labeled case set")
        rows = []
        for case in sorted(truth):
            if {c for c, _ in cases[case]} != set(truth[case]):
                raise ValueError(f"Method {method} candidate set differs from ground truth in case {case}")
            rows.append(eval_case(cases[case], truth[case], k))
        keys = [f"precision@{k}", f"recall@{k}", f"ndcg@{k}", "pairwise_accuracy"]
        report["methods"][method] = {key: round(sum(x[key] for x in rows if x[key] is not None) / max(1, sum(x[key] is not None for x in rows)), 6) for key in keys}
        report["methods"][method]["cases"] = len(rows)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--predictions", required=True)
    parser.add_argument("--ground-truth", required=True)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.k < 1:
        parser.error("--k must be positive")
    result = evaluate(read_jsonl(args.predictions), read_jsonl(args.ground_truth), args.k)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Produced ranking metrics for {len(result['methods'])} REAL scoring methods.")


if __name__ == "__main__":
    main()
