"""Redact common credentials and personal identifiers from CI text artifacts."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REDACTIONS = (
    (re.compile(r"(?i)(authorization\s*:\s*bearer\s+)[^\s]+"), r"\1[REDACTED]"),
    (
        re.compile(
            r"(?i)((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[=:]\s*)"
            r"(?:\"[^\"]*\"|'[^']*'|[^\s,;]+)"
        ),
        r"\1[REDACTED]",
    ),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}(?!\d)"), "[REDACTED_PHONE]"),
)


def sanitize(text: str) -> str:
    for pattern, replacement in REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: sanitize_log.py INPUT OUTPUT", file=sys.stderr)
        return 2
    source, destination = map(Path, argv[1:])
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(sanitize(source.read_text(encoding="utf-8", errors="replace")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
