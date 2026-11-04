"""Isolated configuration contract tests; do not invoke or certify a model provider."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location(
    "runtime_configuration", Path(__file__).parents[1] / "app/services/runtime_configuration.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class RuntimeConfigurationContractTest(unittest.TestCase):
    def settings(self, **overrides):
        values = dict(LLM_PRIMARY_ENABLED=True, LLM_PRIMARY_PROVIDER="openai_compatible",
                      LLM_PRIMARY_MODEL="primary-configured", LLM_FALLBACK_ENABLED=True,
                      LLM_FALLBACK_PROVIDER="ollama", OLLAMA_CHAT_MODEL="actual-chat-model",
                      OLLAMA_MODEL="legacy-other-model", EMBEDDING_MODEL="bge-m3",
                      EMBEDDING_DIMENSION=1024, USE_MOCK_LLM=False,
                      LLM_PRIMARY_API_KEY="fixture-secret-must-not-appear")
        values.update(overrides)
        return SimpleNamespace(**values)

    def test_primary_and_chat_fallback_are_actual_loaded_settings(self):
        result = module.runtime_configuration(self.settings())
        self.assertEqual("primary-configured", result["primary"]["model"])
        self.assertEqual("actual-chat-model", result["fallback"]["model"])

    def test_no_secret_or_url_is_returned(self):
        result = module.runtime_configuration(self.settings())
        self.assertNotIn("fixture-secret", str(result))
        self.assertNotIn("api_key", str(result).lower())

    def test_explicit_mock_mode_is_visible(self):
        self.assertTrue(module.runtime_configuration(self.settings(USE_MOCK_LLM=True))["mockMode"])

    def test_scope_and_restart_semantics_are_explicit(self):
        result = module.runtime_configuration(self.settings())
        self.assertEqual("WORKER_ENVIRONMENT", result["configurationSource"])
        self.assertTrue(result["restartRequiredForChanges"])
        self.assertEqual(1024, result["embedding"]["dimension"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
