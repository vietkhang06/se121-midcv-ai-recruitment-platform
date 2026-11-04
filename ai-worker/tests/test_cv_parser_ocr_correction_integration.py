from types import SimpleNamespace

from app.schemas.cv import CVExtractRequest
from app.schemas.document import DocumentExtractResponse, PageSegment
from app.services.cv_parser import CVParser
from app.services.ocr_text_correction import OcrCorrectionResult


class FakeDocumentExtractor:
    def __init__(self, raw_text):
        self.raw_text = raw_text

    def extract_document(self, request):
        return DocumentExtractResponse(
            status="EXTRACTED",
            source_type="IMAGE",
            used_ocr=True,
            text=self.raw_text,
            raw_source_text=self.raw_text,
            pages=[PageSegment(
                page_number=1,
                text=self.raw_text,
                raw_text=self.raw_text,
                method="image-ocr",
                used_ocr=True,
                start_char=0,
                end_char=len(self.raw_text),
            )],
        )


class FakeCorrectionService:
    def __init__(self):
        self.calls = []

    def correct(self, raw_text, correlation_id):
        self.calls.append((raw_text, correlation_id))
        corrected = raw_text.replace("Kinh nghi?m", "Kinh nghiệm")
        return OcrCorrectionResult(
            raw_text=raw_text,
            corrected_text=corrected,
            status="APPLIED",
            suggestions=[{
                "original": "Kinh nghi?m",
                "corrected": "Kinh nghiệm",
                "category": "COMMON_WORD",
                "confidence": 0.99,
                "reason": "test",
                "applied": True,
                "requires_human_review": False,
            }],
            applied_count=1,
        )


class CapturingLlmClient:
    def __init__(self):
        self.user_text = None

    def generate_json(self, system_instruction, untrusted_content):
        self.user_text = untrusted_content
        return {
            "full_name": "NGUYEN VAN A",
            "skills": [],
            "experiences": [],
            "educations": [],
            "projects": [],
            "certifications": [],
            "languages": [],
        }


def test_ocr_correction_is_used_for_llm_but_raw_text_remains_evidence_source():
    raw = "NGUYEN VAN A\nKinh nghi?m làm việc\nKy nang: Python va Spring Boot"
    corrections = FakeCorrectionService()
    llm = CapturingLlmClient()
    parser = CVParser(
        llm_client=llm,
        document_extractor=FakeDocumentExtractor(raw),
        ocr_correction_service=corrections,
    )

    response = parser.parse_cv_document(CVExtractRequest(
        cv_id="cv-ocr-1",
        cv_version_id="cv-ocr-v1",
        file_type="PNG",
        file_base64="dGVzdA==",
        correlation_id="ocr-integration-1",
    ))

    assert response.status == "SUCCESS"
    assert corrections.calls == [(raw, "ocr-integration-1")]
    assert "Kinh nghiệm" in llm.user_text
    assert "Kinh nghi?m" not in llm.user_text
    assert response.raw_text == raw
    assert response.ocr_corrections["status"] == "APPLIED"
    assert response.ocr_corrections["raw_text_preserved"] is True
