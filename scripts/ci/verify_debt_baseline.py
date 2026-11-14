"""Fail CI when repository-wide legacy debt grows.

The full commands still run and their raw exit codes remain in evidence. This
ratchet only prevents unrelated pre-existing debt on master from blocking a
scoped PR while ensuring no new failures are introduced.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=("backend", "frontend"))
    parser.add_argument("log", type=Path)
    args = parser.parse_args()
    text = args.log.read_text(encoding="utf-8", errors="replace")

    if args.kind == "backend":
        matches = re.findall(
            r"Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)",
            text,
        )
        if not matches:
            print("ERROR: Maven summary was not found")
            return 2
        tests, failures, errors, skipped = map(int, matches[-1])
        print(f"BACKEND_FULL tests={tests} failures={failures} errors={errors} skipped={skipped}")
        if tests < 533:
            print("ERROR: backend test collection shrank below the reviewed baseline")
            return 1
        if failures > 18 or errors > 60:
            print("ERROR: backend legacy-debt baseline regressed")
            return 1
        return 0

    match = re.search(r"[✖x]\s*(\d+) problems \((\d+) errors, (\d+) warnings\)", text)
    if not match:
        if "0 problems" in text or not re.search(r"\berror\b", text, re.IGNORECASE):
            print("FRONTEND_LINT errors=0 warnings=0")
            return 0
        print("ERROR: ESLint summary was not found")
        return 2
    _, errors, warnings = map(int, match.groups())
    print(f"FRONTEND_LINT errors={errors} warnings={warnings}")
    if errors > 72 or warnings > 145:
        print("ERROR: frontend lint debt baseline regressed")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
