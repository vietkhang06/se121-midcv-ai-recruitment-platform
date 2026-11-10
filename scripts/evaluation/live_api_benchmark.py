#!/usr/bin/env python3
"""MID-12: Real HTTP performance probe. No mock endpoints, no fabricated metrics.

Run only against a dedicated test deployment. An endpoint benchmark is NOT a
complete OCR/LLM/Pgvector pipeline benchmark; stage metrics must be added from
real tracing separately.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import statistics
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen


def percentile(values: list[float], p: int) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    import math
    index = max(0, math.ceil(len(ordered) * p / 100) - 1)
    return round(ordered[index], 3)


def probe(url: str, timeout: float, auth_token: str | None) -> dict:
    headers = {"Accept": "application/json", "User-Agent": "MidCV-real-http-benchmark/1"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    request = Request(url, headers=headers, method="GET")
    start = time.perf_counter()
    try:
        with urlopen(request, timeout=timeout) as response:
            response.read()
            code = response.status
        return {"latency_ms": (time.perf_counter() - start) * 1000, "status": code, "timeout": False}
    except HTTPError as error:
        return {"latency_ms": (time.perf_counter() - start) * 1000, "status": error.code, "timeout": False}
    except (TimeoutError, URLError, OSError) as error:
        is_timeout = "timed out" in str(error).lower() or isinstance(error, TimeoutError)
        return {"latency_ms": (time.perf_counter() - start) * 1000, "status": None, "timeout": is_timeout}


def measure(url: str, concurrency: int, count: int, timeout: float, token: str | None) -> dict:
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        samples = list(pool.map(lambda _: probe(url, timeout, token), range(count)))
    elapsed = time.perf_counter() - start
    ok = [s["latency_ms"] for s in samples if s["status"] is not None and 200 <= s["status"] < 300]
    failures = sum(s["status"] is None or not (200 <= s["status"] < 300) for s in samples)
    return {
        "concurrency": concurrency, "requests": count, "successes": len(ok), "failures": failures,
        "timeouts": sum(s["timeout"] for s in samples),
        "p50_ms": percentile(ok, 50), "p95_ms": percentile(ok, 95), "p99_ms": percentile(ok, 99),
        "throughput_rps": round(count / elapsed, 3) if elapsed else None,
        "error_rate": round(failures / count, 4),
        "elapsed_seconds": round(elapsed, 3),
        "statuses": {str(status): sum(s["status"] == status for s in samples) for status in set(s["status"] for s in samples)},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="Real deployed GET endpoint")
    parser.add_argument("--token-env", default="MIDCV_BENCHMARK_TOKEN", help="Name of environment variable (never logged)")
    parser.add_argument("--concurrency", type=int, nargs="+", default=[5, 10, 20])
    parser.add_argument("--requests-per-level", type=int, default=40)
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    u = urlsplit(args.url)
    if u.scheme not in {"http", "https"} or not u.hostname or u.username or u.password:
        parser.error("--url must be an HTTP(S) endpoint without credentials")
    if args.requests_per_level < 1 or any(x < 1 or x > 100 for x in args.concurrency):
        parser.error("requests-per-level must be positive; concurrency must be 1..100")
    if args.timeout <= 0:
        parser.error("timeout must be positive")
    token = os.environ.get(args.token_env)
    # Do not log the query string: it may contain sensitive tokens.
    safe_url = urlunsplit((u.scheme, u.netloc, u.path, "", ""))
    output = {
        "mode": "REAL_HTTP_NO_MOCK", "kind": "ENDPOINT_ONLY_NOT_FULL_PIPELINE",
        "recorded_at": datetime.now(timezone.utc).isoformat(), "endpoint": safe_url,
        "python_version": sys.version.split()[0], "results": [],
    }
    for level in args.concurrency:
        result = measure(args.url, level, args.requests_per_level, args.timeout, token)
        output["results"].append(result)
        print(f"concurrency={level} success={result['successes']}/{result['requests']} p95_ms={result['p95_ms']} error_rate={result['error_rate']}")
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if all(x["failures"] == 0 for x in output["results"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
