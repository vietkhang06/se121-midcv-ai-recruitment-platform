import asyncio
import json
from types import SimpleNamespace

from app.services.cv_structuring_service import CVStructuringService
from app.services.llm.fallback_client import FallbackExecutionResult
from app.services.llm.types import LLMResponse
from app.services.ocr_text_correction import OcrTextCorrectionService


class SequencedOrchestrator:
    def __init__(self):
        self.calls = []
        self.fallback_enabled = False
        self.fallback_client = None

    async def execute(self, messages, correlation_id=None):
        self.calls.append((messages, correlation_id))
        if correlation_id.endswith("ocr-correction"):
            content = json.dumps({"suggestions": [{
                "original": "Kinh nghi?m",
                "corrected": "Kinh nghiệm",
                "category": "COMMON_WORD",
                "confidence": 0.99,
                "reason": "Vietnamese OCR diacritic correction"
            }]}, ensure_ascii=False)
        else:
            content = json.dumps({
                "personalInfo": {"fullName": "NGUYEN VAN A"},
                "summary": "Kinh nghiệm làm việc",
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
                "languages": []
            }, ensure_ascii=False)
        response = LLMResponse(content=content, provider="fake", requested_model="unit-test")
        return FallbackExecutionResult(
            response=response, provider_used="primary", fallback_used=False,
            fallback_reason=None, correlation_id=correlation_id
        )


def test_actual_structuring_service_runs_ocr_correction_only_when_flagged():
    raw = "NGUYEN VAN A\nKinh nghi?m làm việc tại Công ty A"
    orchestrator = SequencedOrchestrator()
    correction = OcrTextCorrectionService(orchestrator, enabled=True)
    service = CVStructuringService(fallback_orchestrator=orchestrator, ocr_correction_service=correction)

    result = asyncio.run(service.structure_raw_text(raw, "structuring-ocr-1", ocr_used=True))

    assert result.success is True
    assert len(orchestrator.calls) == 2
    extraction_prompt = orchestrator.calls[1][0][1]["content"]
    cv_text_block = extraction_prompt.split("<CV_TEXT>", 1)[1].split("</CV_TEXT>", 1)[0]
    assert "Kinh nghiệm" in cv_text_block
    assert "Kinh nghi?m" not in cv_text_block
    # The original span remains visible only in an explicitly untrusted evidence block.
    assert "OCR_REVIEW_SUGGESTIONS (UNVERIFIED; NOT SOURCE FACTS)" in extraction_prompt
    assert "Kinh nghi?m" in extraction_prompt
    assert result.data["ocr_corrections"]["applied_count"] == 1
    assert result.ocrCorrections["raw_text_preserved"] is True


def test_actual_structuring_service_does_not_call_correction_for_native_text():
    raw = "NGUYEN VAN A\nKinh nghiệm làm việc tại Công ty A"
    orchestrator = SequencedOrchestrator()
    correction = OcrTextCorrectionService(orchestrator, enabled=True)
    service = CVStructuringService(fallback_orchestrator=orchestrator, ocr_correction_service=correction)

    result = asyncio.run(service.structure_raw_text(raw, "structuring-native-1", ocr_used=False))

    assert result.success is True
    assert len(orchestrator.calls) == 1
    assert result.ocrCorrections is None


def test_structuring_warns_when_ocr_post_processing_is_disabled():
    raw = "NGUYEN VAN A\nKinh nghi?m làm việc tại Công ty A"
    orchestrator = SequencedOrchestrator()
    correction = OcrTextCorrectionService(orchestrator, enabled=False)
    service = CVStructuringService(fallback_orchestrator=orchestrator, ocr_correction_service=correction)

    result = asyncio.run(service.structure_raw_text(raw, "structuring-ocr-disabled", ocr_used=True))

    assert result.success is True
    assert len(orchestrator.calls) == 1
    assert result.data["ocr_corrections"]["status"] == "DISABLED"
    assert any("original OCR text was retained" in warning for warning in result.data["warnings"])
