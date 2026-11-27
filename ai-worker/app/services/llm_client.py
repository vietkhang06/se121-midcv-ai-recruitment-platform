"""JSON adapter for the JD parser, backed by the shared provider client."""

import json

from app.services.llm.provider import configured_chat_client
from app.services.llm.types import LLMClientProtocol, LLMInvalidResponseError


class LLMClient:
    def __init__(self, chat_client: LLMClientProtocol | None = None):
        self.chat_client = chat_client or configured_chat_client()

    def generate_json(self, system_instruction: str, untrusted_content: str) -> dict:
        response = self.chat_client.chat_sync([
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": json.dumps(
                {"untrusted_document": untrusted_content}, ensure_ascii=False
            )},
        ])
        content = response.content.strip()
        if content.startswith("```") and content.endswith("```"):
            content = content.split("\n", 1)[-1][:-3].strip()
        try:
            value = json.loads(content)
            if isinstance(value, dict):
                return value
        except ValueError:
            pass
        raise LLMInvalidResponseError("Provider did not return a JSON object.", response.provider)
