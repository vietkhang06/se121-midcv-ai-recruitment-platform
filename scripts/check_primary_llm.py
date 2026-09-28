import sys
from pathlib import Path

# Add ai-worker to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai-worker"))

from app.tools.check_primary_llm import check_primary_llm

if __name__ == "__main__":
    sys.exit(check_primary_llm())
