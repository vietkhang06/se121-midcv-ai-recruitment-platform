"""O03: local extraction against labelled synthetic documents. Never calls an LLM.

Optional --approved-reviews JSON maps sample IDs to OcrApplyRequest fields excluding raw_text.
Only explicitly confirmed, source-bound corrections enter the after measurement.
"""
import argparse
import base64
import datetime
import hashlib
import json
from pathlib import Path
import platform
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.evaluation.quality_metrics import text_error_rates
from app.schemas.document import DocumentExtractRequest
from app.services.document_extractor import DocumentExtractor
from app.services.ocr_review_service import OcrApplyRequest, OcrReviewService


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--approved-reviews", type=Path)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    approved = json.loads(args.approved_reviews.read_text(encoding="utf-8")) if args.approved_reviews else {}
    extractor = DocumentExtractor()
    results = []
    for sample in manifest["samples"]:
        path = args.manifest.parent / sample["file"]
        content = path.read_bytes()
        started = time.perf_counter()
        response = extractor.extract_document(DocumentExtractRequest(file_name=path.name,
            file_type=sample["file_type"], file_base64=base64.b64encode(content).decode()))
        row = {"id": sample["id"], "sha256": hashlib.sha256(content).hexdigest(),
               "status": response.status, "error_code": response.error_code,
               "method": [page.method for page in response.pages], "ocr_used": response.used_ocr,
               "duration_ms": round((time.perf_counter() - started) * 1000), "ground_truth": sample["ground_truth"],
               "raw_text": response.text, "before": None, "after": None, "after_status": "NO_APPROVED_REVIEW"}
        if response.text and response.status in ("SUCCESS", "EXTRACTED"):
            row["before"] = text_error_rates(sample["ground_truth"], response.text)
            if sample["id"] in approved:
                request = OcrApplyRequest.model_validate({**approved[sample["id"]], "raw_text": response.text})
                corrected = OcrReviewService.apply(request)["corrected_text"]
                row.update(after=text_error_rates(sample["ground_truth"], corrected), corrected_text=corrected,
                           after_status="USER_CONFIRMED", approved_review=approved[sample["id"]])
        results.append(row)
    report = {"timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "manifest_sha256": hashlib.sha256(args.manifest.read_bytes()).hexdigest(),
              "python": platform.python_version(), "provenance": manifest["provenance"],
              "metric_normalization": "Unicode NFC + collapsed whitespace; accents/case/punctuation preserved",
              "samples": results, "successful_samples": sum(row["before"] is not None for row in results),
              "sample_count": len(results)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["successful_samples"] == len(results) else 2


if __name__ == "__main__":
    raise SystemExit(main())
