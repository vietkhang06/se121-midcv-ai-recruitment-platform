#!/usr/bin/env python3
"""MidCV non-destructive local preflight. No API keys or user data are read.

This is a health/merge-marker diagnostic, NOT a substitute for authenticated E2E,
PostgreSQL queries, provider calls, or an actual pgvector <=> assertion.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import socket
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SCAN_ROOTS = (
    "backend/src/main", "backend/src/test", "ai-worker/app", "ai-worker/tests",
    "frontend/src", "frontend/tests", "frontend/e2e", "scripts"
)
SCAN_SUFFIXES = {".java", ".py", ".ps1", ".ts", ".tsx", ".mjs", ".js", ".yml", ".yaml", ".xml", ".sql", ".json", ".bat", ".properties"}
SKIP_DIRS = {".git", ".venv", "node_modules", "target", ".next", "__pycache__", "dist", "build"}
CONFLICT_MARKER = re.compile(r"^(?:<{7}(?: |$)|={7}\s*$|>{7}(?: |$))")


def scan_merge_conflicts(root: Path) -> list[dict]:
    """Scan project-owned source/config files only, never generated dependencies."""
    findings = []
    for rel in SCAN_ROOTS:
        folder = root / rel
        if not folder.exists():
            continue
        for path in folder.rglob("*"):
            if not path.is_file() or path.is_symlink() or path.suffix.lower() not in SCAN_SUFFIXES:
                continue
            if SKIP_DIRS.intersection(path.relative_to(root).parts):
                continue
            try:
                with path.open("r", encoding="utf-8-sig") as stream:
                    for line_no, line in enumerate(stream, 1):
                        if CONFLICT_MARKER.match(line):
                            findings.append({"path": path.relative_to(root).as_posix(), "line": line_no})
            except (OSError, UnicodeError) as exc:
                findings.append({"path": path.relative_to(root).as_posix(), "error": type(exc).__name__})
    return findings


def probe_http(url: str) -> dict:
    result = {"url": url}
    try:
        req = Request(url, headers={"User-Agent": "MidCV-Diagnostics/1.0", "Accept": "application/json"})
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as err:
            response = err
        with response:
            result["http_status"] = response.status
            if url.endswith("/internal/ai/health") and response.status == 200:
                try:
                    body = json.load(response)
                    if isinstance(body, dict):
                        result["advertised_status"] = body.get("status")
                        result["ocr_status"] = (body.get("ocr") or {}).get("status")
                        llm = body.get("llm") or {}
                        result["primary_llm_reachable"] = bool((llm.get("primary") or {}).get("reachable"))
                        result["fallback_llm_reachable"] = bool((llm.get("fallback") or {}).get("reachable"))
                except (ValueError, UnicodeError):
                    result["response"] = "INVALID_HEALTH_JSON"
    except (URLError, OSError, TimeoutError) as exc:
        result["error"] = type(exc).__name__
    return result


def probe_tcp(host: str, port: int) -> dict:
    try:
        with socket.create_connection((host, port), timeout=2):
            return {"host": host, "port": port, "connection": "OPEN_PORT_ONLY"}
    except (OSError, TimeoutError) as exc:
        return {"host": host, "port": port, "connection": "UNAVAILABLE", "error": type(exc).__name__}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--live", action="store_true", help="Probe real local services, no credentials")
    parser.add_argument("--backend-port", type=int, default=8080)
    parser.add_argument("--worker-port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=3000)
    parser.add_argument("--postgres-port", type=int, default=5432)
    parser.add_argument("--json-out", type=Path, help="Optional JSON diagnostics output path")
    args = parser.parse_args(argv)
    root = args.root.resolve()
    critical = ["backend/pom.xml", "frontend/package.json", "ai-worker/app/main.py"]
    missing = [name for name in critical if not (root / name).is_file()]
    conflicts = scan_merge_conflicts(root)
    result = {"root": str(root), "missing_critical_files": missing, "merge_conflicts": conflicts}
    if args.live:
        result["http"] = [probe_http(url) for url in (
            f"http://127.0.0.1:{args.backend_port}/api/v1/jobs",
            f"http://127.0.0.1:{args.worker_port}/internal/ai/health",
            f"http://127.0.0.1:{args.frontend_port}/",
        )]
        result["postgresql_tcp"] = probe_tcp("127.0.0.1", args.postgres_port)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("NOTICE: TCP reachability != database login/Pgvector; HTTP health != authenticated Candidate-to-HR E2E.")
    if missing or conflicts:
        return 1
    if args.live:
        http_results = result["http"]
        if any("error" in item or item.get("http_status", 599) >= 500 for item in http_results):
            return 2
        if result["postgresql_tcp"]["connection"] == "UNAVAILABLE":
            return 2
        if http_results[1].get("advertised_status") != "UP":
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
