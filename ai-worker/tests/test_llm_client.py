import json
import unittest
from unittest.mock import Mock

from app.services.llm.types import LLMInvalidResponseError, LLMResponse, LLMAuthenticationError
from app.services.llm_client import LLMClient


class JsonProviderAdapterTest(unittest.TestCase):
    def test_json_response_and_untrusted_document(self):
        client = Mock()
        client.chat_sync.return_value = LLMResponse(
            content='{"skills": []}', provider="fixture", requested_model="fixture",
        )
        document = 'A CV with a "quoted" value'
        self.assertEqual({"skills": []}, LLMClient(client).generate_json("Extract facts", document))
        messages = client.chat_sync.call_args.args[0]
        self.assertEqual(document, json.loads(messages[1]["content"])["untrusted_document"])

    def test_non_object_fails(self):
        client = Mock()
        client.chat_sync.return_value = LLMResponse(content="[]", provider="fixture", requested_model="fixture")
        with self.assertRaises(LLMInvalidResponseError):
            LLMClient(client).generate_json("Extract facts", "CV")

    def test_authentication_error_propagates(self):
        client = Mock()
        client.chat_sync.side_effect = LLMAuthenticationError("Invalid key")
        with self.assertRaises(LLMAuthenticationError):
            LLMClient(client).generate_json("Extract facts", "CV")
        client.chat_sync.assert_called_once()
