"""Tests for the standalone diagnostics; no external service needed."""
from pathlib import Path
import importlib.util

SCRIPT = Path(__file__).resolve().parents[1] / "midcv_diagnostics.py"
SPEC = importlib.util.spec_from_file_location("midcv_diagnostics", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def test_conflict_scanner_ignores_generated_node_modules(tmp_path):
    source = tmp_path / "frontend" / "src"
    source.mkdir(parents=True)
    (source / "page.tsx").write_text("<<<<<<< HEAD\n=======\n>>>>>>> feature\n")
    generated = tmp_path / "frontend" / "src" / "node_modules"
    generated.mkdir()
    (generated / "lib.ts").write_text("<<<<<<< HEAD\n")
    findings = module.scan_merge_conflicts(tmp_path)
    assert len(findings) == 3
    assert all(item["path"] == "frontend/src/page.tsx" for item in findings)


def test_without_critical_files_returns_nonzero(tmp_path):
    assert module.main(["--root", str(tmp_path)]) == 1
