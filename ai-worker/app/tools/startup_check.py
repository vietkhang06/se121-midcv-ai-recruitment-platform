import sys
import os
import logging
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.tools.check_primary_llm import check_primary_llm

logger = logging.getLogger(__name__)


def run_startup_checks() -> int:
    print("=" * 60)
    print("MIDCV AI-WORKER PRE-FLIGHT STARTUP CHECK")
    print("=" * 60)

    # 1. Document Extraction & OCR Check
    print("[1/3] Checking Document Extraction & OCR Engine...")
    try:
        import pdfplumber
        import docx
        import pypdfium2
        from app.services.tesseract_runtime import tesseract_runtime
        ocr_health = tesseract_runtime.get_health()
        print("  -> pdfplumber, python-docx, pypdfium2: READY (Local extraction UP)")
        print(f"  -> Tesseract OCR: {ocr_health.get('status')} (Version: {ocr_health.get('version')}, Languages: {', '.join(ocr_health.get('installed_languages', []))})")
    except ImportError as e:
        print(f"  -> CRITICAL: Missing extraction dependency: {e}")
        return 1


    # 2. Primary LLM Check
    print("\n[2/3] Checking PRIMARY LLM Configuration & Connectivity...")
    has_primary_config = bool(
        settings.LLM_PRIMARY_BASE_URL and settings.LLM_PRIMARY_API_KEY and settings.LLM_PRIMARY_MODEL
    )

    primary_ok = False
    if not has_primary_config:
        print("  -> WARNING: PRIMARY LLM is not fully configured (missing URL, key, or model).")
        print("     Please set LLM_PRIMARY_BASE_URL, LLM_PRIMARY_API_KEY, and LLM_PRIMARY_MODEL in .env.")
    else:
        # Run diagnostic check without printing secrets
        print(f"  -> Target URL: {settings.LLM_PRIMARY_BASE_URL}")
        print(f"  -> Target Model: {settings.LLM_PRIMARY_MODEL}")
        code = check_primary_llm()
        if code == 0:
            primary_ok = True
            print("  -> PRIMARY LLM: VERIFIED & READY.")
        else:
            print("  -> CRITICAL: PRIMARY LLM validation failed! Check error details above.")
            print("     According to architecture policy, invalid auth or model will NOT silently fallback.")
            # Note: in strict production this should fail, but in dev/test we report clearly

    # 3. Fallback Ollama Check
    print("\n[3/3] Checking FALLBACK Ollama Engine (127.0.0.1:11434)...")
    if not settings.LLM_FALLBACK_ENABLED:
        print("  -> Ollama Fallback: DISABLED by configuration (LLM_FALLBACK_ENABLED=false).")
    else:
        ollama_ready = False
        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                if res.status_code == 200:
                    ollama_ready = True
        except Exception:
            ollama_ready = False

        if ollama_ready:
            print(f"  -> Fallback Ollama Service: READY on {settings.OLLAMA_BASE_URL} (Model: {settings.OLLAMA_CHAT_MODEL})")
        else:
            print(f"  -> WARNING: Fallback Ollama is not responding on {settings.OLLAMA_BASE_URL}.")
            if primary_ok:
                print("     Notice: Primary LLM is operational. System will run without local fallback.")
            else:
                print("     Warning: Neither Primary LLM nor Ollama is reachable. AI features will report errors.")

    print("\n" + "=" * 60)
    print("PRE-FLIGHT SUMMARY:")
    print(f"  Document Extraction : UP")
    print(f"  Primary LLM         : {'READY' if primary_ok else 'CONFIG_REQUIRED / NOT_READY'}")
    print(f"  Ollama Fallback     : {'READY' if (settings.LLM_FALLBACK_ENABLED and ollama_ready) else 'STANDBY / UNAVAILABLE'}")
    print("=" * 60 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(run_startup_checks())
