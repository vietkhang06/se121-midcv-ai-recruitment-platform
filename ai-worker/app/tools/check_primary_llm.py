import sys
import os
import json
import logging
from pathlib import Path
import httpx

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.services.llm.openai_compatible_client import OpenAICompatibleClient
from app.services.llm.types import (
    LLMAuthenticationError,
    LLMAuthorizationError,
    LLMModelNotFoundError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMServerError,
    LLMNetworkError,
    LLMInvalidResponseError,
    sanitize_sensitive_string,
)

logger = logging.getLogger(__name__)


def check_primary_llm() -> int:
    base_url = settings.LLM_PRIMARY_BASE_URL
    api_key = settings.LLM_PRIMARY_API_KEY
    model = settings.LLM_PRIMARY_MODEL
    timeout = settings.LLM_PRIMARY_TIMEOUT_SECONDS

    # 1. Validate configuration presence
    if not base_url:
        print("ERROR: LLM_PRIMARY_BASE_URL is not set.")
        return 1
    if not api_key:
        print("ERROR: LLM_PRIMARY_API_KEY is not set.")
        return 1
    if not model:
        print("ERROR: LLM_PRIMARY_MODEL is not set.")
        return 1

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # 2. Check /models endpoint if reachable (optional check)
    models_url = f"{base_url}/models"
    try:
        with httpx.Client(timeout=min(timeout, 5.0)) as client:
            resp = client.get(models_url, headers=headers)
            if resp.status_code == 401:
                print("Primary LLM configuration: INVALID")
                print(f"Base URL: {base_url}")
                print(f"Model: {model}")
                print("Failure reason: authentication failure (HTTP 401)")
                return 1
            elif resp.status_code == 403:
                print("Primary LLM configuration: INVALID")
                print(f"Base URL: {base_url}")
                print(f"Model: {model}")
                print("Failure reason: authorization failure (HTTP 403)")
                return 1
    except Exception:
        # Fall through to authoritative chat completion smoke test
        pass

    # 3. Smoke test with Chat Completion requiring simple JSON output
    client = OpenAICompatibleClient(
        base_url=base_url,
        api_key=api_key,
        model=model,
        timeout_seconds=timeout,
        max_retries=0
    )

    test_messages = [
        {"role": "system", "content": "You are a test assistant. Return ONLY the JSON object: {\"status\": \"ok\"}"},
        {"role": "user", "content": "Ping"}
    ]

    try:
        response = client.chat_sync(test_messages)
    except LLMAuthenticationError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: authentication failure (HTTP 401)")
        return 1
    except LLMAuthorizationError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: authorization failure (HTTP 403)")
        return 1
    except LLMModelNotFoundError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: model does not exist (HTTP 404)")
        return 1
    except LLMRateLimitError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: rate limit (HTTP 429)")
        return 1
    except LLMServerError as e:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print(f"Failure reason: provider 5xx (HTTP {e.status_code})")
        return 1
    except LLMTimeoutError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: timeout")
        return 1
    except LLMNetworkError:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print("Failure reason: connection refused")
        return 1
    except LLMInvalidResponseError as e:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print(f"Failure reason: response không hợp lệ ({e.raw_message})")
        return 1
    except Exception as e:
        print("Primary LLM configuration: INVALID")
        print(f"Base URL: {base_url}")
        print(f"Model: {model}")
        print(f"Failure reason: unexpected error ({sanitize_sensitive_string(str(e))})")
        return 1

    # Verify JSON content
    is_json_valid = False
    clean_content = response.content.strip()
    if clean_content.startswith("```"):
        lines = clean_content.splitlines()
        clean_content = "\n".join([l for l in lines if not l.strip().startswith("```")]).strip()
    try:
        json.loads(clean_content)
        is_json_valid = True
    except Exception:
        is_json_valid = False

    # Output formatted report matching requirements
    print("Primary LLM configuration: VALID")
    print(f"Base URL: {base_url}")
    print(f"Model: {model}")
    print("Authentication: OK")
    print("Chat completion: OK")
    print(f"JSON response: {'OK' if is_json_valid else 'WARNING: Content returned but not strictly JSON'}")
    return 0


if __name__ == "__main__":
    sys.exit(check_primary_llm())
