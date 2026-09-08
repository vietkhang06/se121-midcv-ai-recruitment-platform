import os
import sys
from pathlib import Path

# Add ai-worker to sys.path
root_dir = Path(__file__).resolve().parent.parent
ai_worker_dir = root_dir / "ai-worker"
sys.path.insert(0, str(ai_worker_dir))

from scripts.real_llm_smoke_test import run_real_llm_smoke_test

if __name__ == "__main__":
    run_real_llm_smoke_test()
