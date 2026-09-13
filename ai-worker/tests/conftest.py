import os
import sys
from pathlib import Path
import pytest

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

# Ensure automated pytest tests run with mock LLM enabled for deterministic offline testing
os.environ["USE_MOCK_LLM"] = "true"

from app.config import settings
settings.USE_MOCK_LLM = True

from tests.fixtures.mock_llm_client import MockLLMClient
from app.services.llm_client import LLMClient

_original_generate_json = LLMClient.generate_json

@pytest.fixture(autouse=True)
def auto_mock_llm_for_offline_tests(request):
    """
    Test-only fixture: Automatically delegates LLM calls to MockLLMClient for offline tests
    (e.g., test_api_endpoints, test_idempotency_lifecycle) to preserve deterministic offline testing.
    Tests specifically targeting LLMClient (test_llm_client.py, test_cv_information_extraction.py)
    run with the unpatched real LLMClient.
    """
    test_module = getattr(getattr(request.node, "module", None), "__name__", "")
    if "test_llm_client" in test_module or "test_cv_information_extraction" in test_module:
        LLMClient.generate_json = _original_generate_json
        yield
        return

    mock_client = MockLLMClient()
    def _test_generate_json(self, system_instruction: str, untrusted_content: str):
        return mock_client.generate_json(system_instruction, untrusted_content)

    LLMClient.generate_json = _test_generate_json
    yield
    LLMClient.generate_json = _original_generate_json
