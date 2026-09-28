import sys
from pathlib import Path

# Add ai-worker to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai-worker"))

from app.tools.extract_document import main

if __name__ == "__main__":
    main()
