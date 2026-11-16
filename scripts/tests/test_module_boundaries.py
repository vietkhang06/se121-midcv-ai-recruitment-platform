import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("boundaries", Path(__file__).parents[1] / "check_module_boundaries.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def test_cycles_and_new_repository_access_fail_regression_gate(tmp_path):
    (tmp_path / "cv").mkdir()
    (tmp_path / "job").mkdir()
    (tmp_path / "cv" / "Reader.java").write_text("package com.platform.recruitment.cv;\nimport com.platform.recruitment.job.Job;\n")
    baseline = module.snapshot(tmp_path)
    (tmp_path / "job" / "Writer.java").write_text("package com.platform.recruitment.job;\nimport com.platform.recruitment.cv.CVRepository;\n")
    current = module.snapshot(tmp_path)
    accesses, cycles = module.violations(current, baseline)
    assert len(accesses) == 1
    assert cycles == [["job", "cv"]]
    assert current["cycles"] == [["cv", "job"]]

def test_existing_debt_is_explicit_but_new_acyclic_api_edge_is_allowed(tmp_path):
    (tmp_path / "cv").mkdir()
    file = tmp_path / "cv" / "Reader.java"
    file.write_text("package com.platform.recruitment.cv;\nimport com.platform.recruitment.job.JobRepository;\n")
    baseline = module.snapshot(tmp_path)
    file.write_text(file.read_text() + "import com.platform.recruitment.common.ApiResponse;\n")
    assert module.violations(module.snapshot(tmp_path), baseline) == ([], [])
