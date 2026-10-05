import pytest
from unittest.mock import patch, MagicMock
from app.services.tesseract_runtime import TesseractRuntime, tesseract_runtime
from app.services.ocr_exceptions import (
    OcrDependencyMissingException,
    OcrLanguageMissingException,
    OcrMisconfiguredException
)
from app.config import settings


class TestTesseractRuntime:
    def test_health_check_structure(self):
        health = tesseract_runtime.get_health()
        assert "enabled" in health
        assert "status" in health
        assert "required_languages" in health
        assert "installed_languages" in health
        assert "eng" in health["required_languages"]
        assert "vie" in health["required_languages"]

    def test_status_when_disabled(self):
        with patch.object(settings, "OCR_ENABLED", False):
            runtime = TesseractRuntime()
            health = runtime.get_health()
            assert health["enabled"] is False
            assert health["status"] == "DISABLED"
            with pytest.raises(OcrMisconfiguredException):
                runtime.assert_ready()

    def test_status_when_binary_not_found(self):
        with patch.object(settings, "OCR_ENABLED", True), \
             patch.object(TesseractRuntime, "_resolve_executable", return_value=None):
            runtime = TesseractRuntime()
            health = runtime.get_health()
            assert health["status"] == "BINARY_NOT_FOUND"
            with pytest.raises(OcrDependencyMissingException):
                runtime.assert_ready()

    def test_status_when_languages_missing(self):
        import sys
        with patch.object(settings, "OCR_ENABLED", True), \
             patch.object(TesseractRuntime, "_resolve_executable", return_value=sys.executable), \
             patch.object(TesseractRuntime, "_detect_version", return_value="5.4.0"), \
             patch.object(TesseractRuntime, "_detect_languages", return_value=["eng"]), \
             patch.object(TesseractRuntime, "get_required_languages", return_value=["eng", "vie"]):
            runtime = TesseractRuntime()
            health = runtime.get_health()
            assert health["status"] == "LANGUAGE_MISSING"
            assert "vie" in health["missing_languages"]
            with pytest.raises(OcrLanguageMissingException):
                runtime.assert_ready()

    def test_status_ready_when_all_present(self):
        import sys
        with patch.object(settings, "OCR_ENABLED", True), \
             patch.object(TesseractRuntime, "_resolve_executable", return_value=sys.executable), \
             patch.object(TesseractRuntime, "_detect_version", return_value="5.4.0"), \
             patch.object(TesseractRuntime, "_detect_languages", return_value=["eng", "vie", "osd"]), \
             patch.object(TesseractRuntime, "get_required_languages", return_value=["eng", "vie"]):
            runtime = TesseractRuntime()
            health = runtime.get_health()
            assert health["status"] == "READY"
            assert health["missing_languages"] == []
            # Should not raise exception
            runtime.assert_ready()


    def test_config_validation(self):
        with patch.object(settings, "OCR_TIMEOUT_SECONDS", -5):
            errors = settings.validate_ocr_settings()
            assert any("OCR_TIMEOUT_SECONDS" in e for e in errors)

        with patch.object(settings, "OCR_DPI", 10):
            errors = settings.validate_ocr_settings()
            assert any("OCR_DPI" in e for e in errors)
