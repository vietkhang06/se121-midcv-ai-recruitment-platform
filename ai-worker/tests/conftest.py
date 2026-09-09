import os
import sys
from pathlib import Path
import pytest

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

# Ensure all automated pytest tests run with mock LLM enabled for deterministic offline testing
os.environ["USE_MOCK_LLM"] = "true"

from app.config import settings
settings.USE_MOCK_LLM = True
