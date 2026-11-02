"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.evaluation.quality_metrics import text_error_rates

def test_ocr_metrics_preserve_vietnamese_accents_and_count_errors():
    assert text_error_rates("Kỹ năng", "Kỹ  năng") == {"cer": 0.0, "wer": 0.0}
    assert text_error_rates("Kỹ năng", "Ky nang")["wer"] == 1.0
    assert text_error_rates("abc", "ab")["cer"] == pytest.approx(1 / 3)
