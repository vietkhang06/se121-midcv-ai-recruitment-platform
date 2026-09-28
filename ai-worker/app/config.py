import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    base_dir = Path(__file__).resolve().parent.parent
    local_env = base_dir / ".env"
    root_env = base_dir.parent / ".env"
    if local_env.exists():
        load_dotenv(local_env, override=True)
    elif root_env.exists():
        load_dotenv(root_env, override=True)
    else:
        load_dotenv(override=True)
except ImportError:
    pass


class Settings(BaseModel):
    PROJECT_NAME: str = "MidCV AI Worker"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/internal/ai"
    
    # Provider selection: 'auto' (default: primary with fallback), 'openai_compatible', 'ollama', 'mock'
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto").lower()
    
    # -------------------------------------------------------------
    # PRIMARY LLM Configuration (OpenAI Compatible)
    # -------------------------------------------------------------
    LLM_PRIMARY_PROVIDER: str = os.getenv("LLM_PRIMARY_PROVIDER", "openai_compatible")
    LLM_PRIMARY_BASE_URL: str = os.getenv(
        "LLM_PRIMARY_BASE_URL", 
        os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    ).rstrip("/")
    LLM_PRIMARY_API_KEY: str = os.getenv("LLM_PRIMARY_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    LLM_PRIMARY_MODEL: str = os.getenv("LLM_PRIMARY_MODEL") or os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_PRIMARY_TIMEOUT_SECONDS: float = float(os.getenv("LLM_PRIMARY_TIMEOUT_SECONDS", "180"))
    LLM_PRIMARY_MAX_RETRIES: int = int(os.getenv("LLM_PRIMARY_MAX_RETRIES", "1"))

    # Aliases for backward compatibility with existing tests
    OPENAI_API_KEY: str = os.getenv("LLM_PRIMARY_API_KEY", os.getenv("OPENAI_API_KEY", "mock-openai-key"))
    OPENAI_MODEL: str = os.getenv("LLM_PRIMARY_MODEL") or os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    OPENAI_BASE_URL: str = os.getenv("LLM_PRIMARY_BASE_URL", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
    
    # -------------------------------------------------------------
    # FALLBACK LLM Configuration (Local Ollama)
    # -------------------------------------------------------------
    LLM_FALLBACK_ENABLED: bool = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true"
    LLM_FALLBACK_PROVIDER: str = os.getenv("LLM_FALLBACK_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    OLLAMA_CHAT_MODEL: str = os.getenv("OLLAMA_CHAT_MODEL", os.getenv("OLLAMA_MODEL", "dna5rm/granite4.2:3b-8k"))
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", os.getenv("OLLAMA_CHAT_MODEL", "dna5rm/granite4.2:3b-8k"))
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))
    OLLAMA_MAX_RETRIES: int = int(os.getenv("OLLAMA_MAX_RETRIES", "0"))
    
    # Mock fallback gating (strictly only used when explicit test mode)
    USE_MOCK_LLM: bool = os.getenv("USE_MOCK_LLM", "false").lower() == "true"
    
    # Dev test endpoints
    ENABLE_DEV_AI_TEST_ENDPOINTS: bool = os.getenv("ENABLE_DEV_AI_TEST_ENDPOINTS", "false").lower() == "true"
    
    # GitHub Integration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_API_BASE_URL: str = os.getenv("GITHUB_API_BASE_URL", "https://api.github.com").rstrip("/")

    def validate_llm_settings(self, fail_fast: bool = True) -> list[str]:
        """
        Validates the configuration of primary and fallback LLM endpoints.
        Ensures fail-fast when required settings are missing or invalid.
        Guarantees NO secrets are leaked in error messages.
        """
        errors = []
        if not self.LLM_PRIMARY_BASE_URL:
            errors.append("PRIMARY LLM Base URL is missing (LLM_PRIMARY_BASE_URL).")
        if not self.LLM_PRIMARY_API_KEY:
            errors.append("PRIMARY LLM API Key is missing (LLM_PRIMARY_API_KEY).")
        if not self.LLM_PRIMARY_MODEL:
            errors.append("PRIMARY LLM Model is missing (LLM_PRIMARY_MODEL).")
        if self.LLM_PRIMARY_TIMEOUT_SECONDS <= 0:
            errors.append(f"PRIMARY LLM timeout must be greater than 0 (got {self.LLM_PRIMARY_TIMEOUT_SECONDS}).")
        if self.LLM_PRIMARY_MAX_RETRIES < 0:
            errors.append(f"PRIMARY LLM retries must be >= 0 (got {self.LLM_PRIMARY_MAX_RETRIES}).")

        if self.LLM_FALLBACK_ENABLED:
            if not self.OLLAMA_BASE_URL:
                errors.append("Ollama Base URL is missing while fallback is enabled (OLLAMA_BASE_URL).")
            if not self.OLLAMA_CHAT_MODEL:
                errors.append("Ollama Chat Model is missing while fallback is enabled (OLLAMA_CHAT_MODEL).")
            if self.OLLAMA_TIMEOUT_SECONDS <= 0:
                errors.append(f"Ollama timeout must be greater than 0 (got {self.OLLAMA_TIMEOUT_SECONDS}).")
            if self.OLLAMA_MAX_RETRIES < 0:
                errors.append(f"Ollama retries must be >= 0 (got {self.OLLAMA_MAX_RETRIES}).")

        if errors and fail_fast:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

        return errors


settings = Settings()
