"""Check configured provider and OCR readiness."""

from app.services.provider_health import get_llm_providers_health
from app.services.tesseract_runtime import tesseract_runtime


def run_startup_checks() -> int:
    provider = get_llm_providers_health(force_refresh=True)["primary"]
    ocr = tesseract_runtime.get_health().get("status")
    print(f"LLM provider reachable with configured model: {provider['reachable']}")
    print(f"OCR status: {ocr}")
    return 0 if provider["reachable"] and ocr == "READY" else 1


if __name__ == "__main__":
    raise SystemExit(run_startup_checks())
