from pathlib import Path

from scripts.ci import verify_debt_baseline


def run(tmp_path: Path, kind: str, content: str) -> int:
    log = tmp_path / "gate.log"
    log.write_text(content, encoding="utf-8")
    import sys

    old = sys.argv
    try:
        sys.argv = ["verify_debt_baseline.py", kind, str(log)]
        return verify_debt_baseline.main()
    finally:
        sys.argv = old


def test_backend_ratchet(tmp_path):
    assert run(tmp_path, "backend", "Tests run: 533, Failures: 18, Errors: 60, Skipped: 31") == 0
    assert run(tmp_path, "backend", "Tests run: 533, Failures: 19, Errors: 60, Skipped: 31") == 1
    assert run(tmp_path, "backend", "Tests run: 532, Failures: 0, Errors: 0, Skipped: 0") == 1


def test_frontend_ratchet(tmp_path):
    assert run(tmp_path, "frontend", "✖ 217 problems (72 errors, 145 warnings)") == 0
    assert run(tmp_path, "frontend", "✖ 218 problems (73 errors, 145 warnings)") == 1
