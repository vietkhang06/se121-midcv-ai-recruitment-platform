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
        load_dotenv(local_env, override=False)
    elif root_env.exists():
        load_dotenv(root_env, override=False)
    else:
        load_dotenv(override=False)
except ImportError:
    pass


class Settings(BaseModel):
    PROJECT_NAME: str = "MidCV AI Worker"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/internal/ai"
    
    # PRIMARY LLM Configuration (OpenAI Compatible)
    # -------------------------------------------------------------
    LLM_PRIMARY_ENABLED: bool = os.getenv("LLM_PRIMARY_ENABLED", "true").lower() == "true"
    LLM_PRIMARY_PROVIDER: str = "openai_compatible"
    LLM_PRIMARY_BASE_URL: str = os.getenv(
        "LLM_PRIMARY_BASE_URL", 
        os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    ).rstrip("/")
    LLM_PRIMARY_API_KEY: str = os.getenv("LLM_PRIMARY_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    LLM_PRIMARY_MODEL: str = os.getenv("LLM_PRIMARY_MODEL") or os.getenv("OPENAI_MODEL") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_PRIMARY_TIMEOUT_SECONDS: float = float(os.getenv("LLM_PRIMARY_TIMEOUT_SECONDS", "180"))
    LLM_PRIMARY_MAX_RETRIES: int = int(os.getenv("LLM_PRIMARY_MAX_RETRIES", "1"))

    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    EMBEDDING_DIMENSION: int = 1024
    EMBEDDING_BASE_URL: str = os.getenv("EMBEDDING_BASE_URL") or LLM_PRIMARY_BASE_URL
    EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY") or (
        LLM_PRIMARY_API_KEY if EMBEDDING_BASE_URL.rstrip("/") == LLM_PRIMARY_BASE_URL else ""
    )
    EMBEDDING_TIMEOUT_SECONDS: float = float(os.getenv("EMBEDDING_TIMEOUT_SECONDS", "60"))

    # Dev test endpoints
    ENABLE_DEV_AI_TEST_ENDPOINTS: bool = os.getenv("ENABLE_DEV_AI_TEST_ENDPOINTS", "false").lower() == "true"
    
    # GitHub Integration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_API_BASE_URL: str = os.getenv("GITHUB_API_BASE_URL", "https://api.github.com").rstrip("/")

    # -------------------------------------------------------------
    # OCR Configuration (Tesseract 5.x Native Engine)
    # -------------------------------------------------------------
    OCR_ENABLED: bool = os.getenv("OCR_ENABLED", "true").lower() == "true"
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")
    TESSDATA_PREFIX: str = os.getenv("TESSDATA_PREFIX", "")
    OCR_LANGUAGES: str = os.getenv("OCR_LANGUAGES", "vie+eng")
    OCR_TIMEOUT_SECONDS: int = int(os.getenv("OCR_TIMEOUT_SECONDS", "120"))
    OCR_DPI: int = int(os.getenv("OCR_DPI", "300"))
    OCR_MIN_TEXT_CHARS_PER_PAGE: int = int(os.getenv("OCR_MIN_TEXT_CHARS_PER_PAGE", "40"))
    OCR_MAX_PAGES: int = int(os.getenv("OCR_MAX_PAGES", "30"))
    OCR_PSM: int = int(os.getenv("OCR_PSM", "3"))
    OCR_LLM_CORRECTION_ENABLED: bool = os.getenv("OCR_LLM_CORRECTION_ENABLED", "true").lower() == "true"
    OCR_LLM_CORRECTION_MIN_CONFIDENCE: float = float(os.getenv("OCR_LLM_CORRECTION_MIN_CONFIDENCE", "0.92"))
    OCR_LLM_CORRECTION_MAX_CHARS: int = int(os.getenv("OCR_LLM_CORRECTION_MAX_CHARS", "40000"))

    def validate_ocr_settings(self, fail_fast: bool = False) -> list[str]:
        """Validates OCR configuration parameters."""
        errors = []
        if self.OCR_ENABLED:
            if not self.OCR_LANGUAGES or not self.OCR_LANGUAGES.strip():
                errors.append("OCR_LANGUAGES must not be empty when OCR_ENABLED is true.")
            if self.OCR_TIMEOUT_SECONDS <= 0:
                errors.append(f"OCR_TIMEOUT_SECONDS must be > 0 (got {self.OCR_TIMEOUT_SECONDS}).")
            if self.OCR_DPI < 72 or self.OCR_DPI > 600:
                errors.append(f"OCR_DPI must be between 72 and 600 (got {self.OCR_DPI}).")
            if self.OCR_MIN_TEXT_CHARS_PER_PAGE < 0:
                errors.append(f"OCR_MIN_TEXT_CHARS_PER_PAGE must be >= 0 (got {self.OCR_MIN_TEXT_CHARS_PER_PAGE}).")
            if self.OCR_MAX_PAGES <= 0:
                errors.append(f"OCR_MAX_PAGES must be > 0 (got {self.OCR_MAX_PAGES}).")
            if self.OCR_PSM < 0 or self.OCR_PSM > 13:
                errors.append(f"OCR_PSM must be between 0 and 13 (got {self.OCR_PSM}).")
            if self.TESSERACT_CMD and self.TESSERACT_CMD.strip():
                cmd_path = Path(self.TESSERACT_CMD.strip().strip('"').strip("'"))
                if not cmd_path.is_file():
                    errors.append(f"Configured TESSERACT_CMD does not exist or is not a file: {self.TESSERACT_CMD}")
            if self.TESSDATA_PREFIX and self.TESSDATA_PREFIX.strip():
                prefix_path = Path(self.TESSDATA_PREFIX.strip().strip('"').strip("'"))
                if not prefix_path.is_dir():
                    errors.append(f"Configured TESSDATA_PREFIX does not exist or is not a directory: {self.TESSDATA_PREFIX}")

        if errors and fail_fast:
            raise ValueError(f"OCR configuration validation failed: {'; '.join(errors)}")
        return errors

    def validate_llm_settings(self, fail_fast: bool = True) -> list[str]:
        """
        Validates the configuration of the LLM provider.
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

        if errors and fail_fast:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

        return errors


settings = Settings()
