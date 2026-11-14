import json
from types import SimpleNamespace

from app.services.ocr_text_correction import OcrTextCorrectionService


class FakeOrchestrator:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    def execute_sync(self, messages, correlation_id=None):
        self.calls.append((messages, correlation_id))
        if self.error:
            raise self.error
        return SimpleNamespace(response=SimpleNamespace(content=json.dumps(self.response or {"suggestions": []})))


def test_applies_only_high_confidence_common_word_correction_and_keeps_raw_text():
    raw = "Kinh nghi?m làm việc tại Công ty A."
    orchestrator = FakeOrchestrator({
        "suggestions": [{
            "original": "Kinh nghi?m",
            "corrected": "Kinh nghiệm",
            "category": "COMMON_WORD",
            "confidence": 0.99,
            "reason": "Vietnamese diacritic OCR confusion",
        }]
    })
    result = OcrTextCorrectionService(orchestrator).correct(raw, "corr-1")

    assert result.raw_text == raw
    assert result.corrected_text == "Kinh nghiệm làm việc tại Công ty A."
    assert result.applied_count == 1
    assert result.suggestions[0]["applied"] is True
    assert result.suggestions[0]["requires_human_review"] is False


def test_technical_term_and_address_are_suggestions_not_auto_applied():
    raw = "Ky nang: Sprlng Boot. Dia chi: Q. 1, TP H0 Chi Minh."
    orchestrator = FakeOrchestrator({
        "suggestions": [
            {
                "original": "Sprlng Boot",
                "corrected": "Spring Boot",
                "category": "TECHNICAL_TERM",
                "confidence": 0.98,
                "reason": "Likely OCR confusion in a known technical term",
            },
            {
                "original": "Q.",
                "corrected": "Quận",
                "category": "ADDRESS_COMPONENT",
                "confidence": 0.96,
                "reason": "Common administrative abbreviation",
            },
        ]
    })
    result = OcrTextCorrectionService(orchestrator).correct(raw, "corr-2")

    assert result.corrected_text == raw
    assert result.applied_count == 0
    assert len(result.suggestions) == 2
    assert all(item["requires_human_review"] for item in result.suggestions)


def test_rejects_unverified_or_unsafe_suggestions():
    raw = "Email: candidate@example.com; Nam sinh: 2002; Cong ty ABC"
    orchestrator = FakeOrchestrator({
        "suggestions": [
            {"original": "ABC Ltd", "corrected": "ABC Limited", "category": "COMMON_WORD", "confidence": 0.99},
            {"original": "2002", "corrected": "2003", "category": "COMMON_WORD", "confidence": 0.99},
            {"original": "candidate@example.com", "corrected": "candidate2@example.com", "category": "COMMON_WORD", "confidence": 0.99},
            {"original": "Cong ty ABC", "corrected": "Công ty XYZ", "category": "COMMON_WORD", "confidence": 0.99},
            {"original": "Nam sinh", "corrected": "Năm sinh", "category": "COMMON_WORD", "confidence": 0.60},
        ]
    })
    result = OcrTextCorrectionService(orchestrator).correct(raw, "corr-3")

    assert result.corrected_text == raw
    assert result.suggestions == []


def test_duplicate_source_span_is_not_automatically_changed():
    raw = "ky nang ky nang"
    orchestrator = FakeOrchestrator({
        "suggestions": [{
            "original": "ky nang",
            "corrected": "kỹ năng",
            "category": "COMMON_WORD",
            "confidence": 0.99,
        }]
    })
    result = OcrTextCorrectionService(orchestrator).correct(raw, "corr-4")
    assert result.corrected_text == raw
    assert result.suggestions == []


def test_provider_failure_falls_back_to_original_text():
    raw = "Ho va ten: Nguyen Van A; Dia chi: Quan 1"
    result = OcrTextCorrectionService(FakeOrchestrator(error=TimeoutError("provider timeout"))).correct(raw, "corr-5")
    assert result.status == "FAILED_FALLBACK"
    assert result.corrected_text == raw
    assert result.raw_text == raw
    assert result.skipped_reason == "TimeoutError"


def test_skips_oversized_input_without_calling_provider():
    orchestrator = FakeOrchestrator({"suggestions": []})
    result = OcrTextCorrectionService(orchestrator, max_input_chars=5).correct("longer input", "corr-6")
    assert result.status == "SKIPPED"
    assert result.skipped_reason == "INPUT_TOO_LARGE"
    assert orchestrator.calls == []


def test_diacritic_only_suggestions_are_review_only_without_ocr_corruption_marker():
    raw = "Le Minh ung tuyen vi tri ky su phan mem"
    orchestrator = FakeOrchestrator({
        "suggestions": [{
            "original": "Le Minh",
            "corrected": "Lê Minh",
            "category": "COMMON_WORD",
            "confidence": 0.99,
            "reason": "Possible Vietnamese diacritic normalization",
        }]
    })
    result = OcrTextCorrectionService(orchestrator).correct(raw, "corr-7")

    assert result.corrected_text == raw
    assert result.applied_count == 0
    assert len(result.suggestions) == 1
    assert result.suggestions[0]["requires_human_review"] is True
    assert result.suggestions[0]["auto_apply_allowed"] is False
