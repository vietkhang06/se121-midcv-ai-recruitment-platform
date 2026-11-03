"""O03: labelled OCR benchmark. Default extraction is local; primary review is opt-in.

Optional --approved-reviews JSON maps sample IDs to OcrApplyRequest fields excluding raw_text.
Approved mode measures confirmed corrections; primary mode measures a validated preview without applying a CV.
"""
import argparse
import asyncio
import copy
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.evaluation.quality_metrics import text_error_rates
from app.schemas.document import DocumentExtractRequest
from app.services.document_extractor import DocumentExtractor
from app.services.ocr_review_service import OcrApplyRequest, OcrReviewService
from app.services.ocr_review_service import OcrReviewRequest, OcrProposal, source_hash


def revalidate_saved_responses(report):
    """Revalidate exact recorded provider outputs after a validator fix, without new API calls."""
    for row in report["samples"]:
        trace = row.get("rejection_trace")
        if row.get("after_status") != "REJECTED_PROPOSAL_NO_CHANGE" or not trace:
            continue
        if trace["source_sha256"] != source_hash(row["raw_text"]):
            raise ValueError("Saved provider response source is stale")
        try:
            edits = OcrReviewService.validated_changes(row["raw_text"], trace["provider_output"])
        except ValueError:
            continue
        row.setdefault("previous_attempts", []).append({key: copy.deepcopy(row[key]) for key in
            ("after_status", "after", "rejection_trace", "rejection_reason") if key in row})
        proposal = OcrProposal(source_sha256=trace["source_sha256"], edits=edits,
            provider=trace["provider"], model=trace["model"] or trace["requested_model"], usage=trace["usage"])
        corrected = OcrReviewService.preview_text(row["raw_text"], proposal)
        row.update(proposal=proposal.model_dump(), corrected_text=corrected,
                   after=text_error_rates(row["ground_truth"], corrected),
                   after_status="PROPOSAL_PREVIEW_NOT_APPLIED" if edits else "NO_CHANGE_PROPOSED",
                   local_revalidation={"provider_output_sha256": source_hash(trace["provider_output"]), "additional_api_calls": 0})
        row["delta"] = {metric: row["after"][metric] - row["before"][metric] for metric in ("cer", "wer")}
        for key in ("rejection_trace", "rejection_reason", "rejection_type"):
            row.pop(key, None)
    return report


def load_baseline(manifest_path, report_path):
    """Reuse real local extraction only when all inputs still match their recorded hashes."""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report["manifest_sha256"] != hashlib.sha256(manifest_path.read_bytes()).hexdigest():
        raise ValueError("Stale extraction manifest")
    rows = {row["id"]: row for row in report["samples"]}
    if len(rows) != len(manifest["samples"]) or len(rows) != len(report["samples"]):
        raise ValueError("Extraction sample set mismatch")
    for sample in manifest["samples"]:
        row = rows[sample["id"]]
        if (row["sha256"] != hashlib.sha256((manifest_path.parent / sample["file"]).read_bytes()).hexdigest()
                or row["ground_truth"] != sample["ground_truth"] or not row["raw_text"]
                or row["status"] not in ("SUCCESS", "EXTRACTED")):
            raise ValueError("Stale or unsuccessful extraction sample")
        row["before"] = text_error_rates(sample["ground_truth"], row["raw_text"])
    return copy.deepcopy(report)


async def measure_proposals(report, service, max_calls):
    pending = [row for row in report["samples"] if row.get("after") is None or row.get("after_status") == "REJECTED_PROPOSAL_NO_CHANGE"]
    if max_calls < len(pending):
        raise ValueError("Provider call budget is smaller than the dataset; no calls made")
    for row in pending:
        if row.get("after") is not None:
            row.setdefault("previous_attempts", []).append({key: copy.deepcopy(row[key]) for key in (
                "after_status", "after", "rejection_trace", "rejection_reason", "rejection_type") if key in row})
        started = time.perf_counter()
        # Ground truth is deliberately never sent to the provider.
        try:
            proposal = await service.propose(OcrReviewRequest(raw_text=row["raw_text"]))
            corrected = service.preview_text(row["raw_text"], proposal)
            row.update(proposal=proposal.model_dump(), corrected_text=corrected,
                       after_status="PROPOSAL_PREVIEW_NOT_APPLIED" if proposal.edits else "NO_CHANGE_PROPOSED")
        except ValueError as error:
            # Rejected output is measured as no change, never silently accepted.
            corrected = row["raw_text"]
            row.update(corrected_text=corrected, after_status="REJECTED_PROPOSAL_NO_CHANGE",
                       rejection_type=type(error).__name__)
            if hasattr(error, "trace"):
                row.update(rejection_trace=error.trace, rejection_reason=str(error))
        # Transport/auth failures propagate and stop further paid requests.
        row.update(after=text_error_rates(row["ground_truth"], corrected),
                   review_duration_ms=round((time.perf_counter() - started) * 1000),
                   approval_state="NOT_CONFIRMED_NO_CV_WRITE")
        row["delta"] = {metric: row["after"][metric] - row["before"][metric] for metric in ("cer", "wer")}
    report["provider_calls"] = report.get("provider_calls", 0) + len(pending)
    report["timestamp_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return report


def write_markdown(report, path):
    lines = ["# O03: real OCR + primary API proposal benchmark", "",
        "Synthetic labelled documents; labels are independent and never sent to the provider. "
        "After = validated proposal preview, not human approval or a saved CV. Lower CER/WER is better. "
        "This small dataset does not establish production accuracy.", "",
        "| Sample | CER before | CER after | WER before | WER after | Result |",
        "|---|---:|---:|---:|---:|---|"]
    for row in report["samples"]:
        lines.append(f'| {row["id"]} | {row["before"]["cer"]:.6f} | {row["after"]["cer"]:.6f} | '
                     f'{row["before"]["wer"]:.6f} | {row["after"]["wer"]:.6f} | {row["after_status"]} |')
    for row in report["samples"]:
        lines.extend(["", f'## {row["id"]}', "", "Raw OCR:", "```text", row["raw_text"], "```",
                      "Proposed text:", "```text", row["corrected_text"], "```",
                      "Trace:", "```json", json.dumps(row.get("proposal", row.get("rejection_trace", {"rejection_type": row.get("rejection_type")})),
                                                        ensure_ascii=False, indent=2), "```"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--approved-reviews", type=Path)
    parser.add_argument("--review-primary", action="store_true", help="Opt in to bounded real provider calls")
    parser.add_argument("--extraction-report", type=Path)
    parser.add_argument("--max-provider-calls", type=int, default=5)
    parser.add_argument("--max-output-tokens", type=int, default=1024)
    parser.add_argument("--markdown-output", type=Path)
    parser.add_argument("--resume-report", type=Path, help="Reuse validated completed samples; retry only rejected/missing results")
    parser.add_argument("--revalidate-saved", action="store_true", help="Recheck saved real API outputs locally; zero API calls")
    args = parser.parse_args()
    if args.revalidate_saved:
        if not args.resume_report or args.review_primary:
            parser.error("Local revalidation requires --resume-report and excludes --review-primary")
        report = revalidate_saved_responses(load_baseline(args.manifest, args.resume_report))
        report["validator_sha256"] = hashlib.sha256((Path(__file__).parents[1] / "app/services/ocr_review_service.py").read_bytes()).hexdigest()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        if args.markdown_output:
            write_markdown(report, args.markdown_output)
        return 0
    if args.review_primary:
        if not args.extraction_report or args.approved_reviews:
            parser.error("Primary review requires --extraction-report and excludes --approved-reviews")
        from app.services.llm.openai_compatible_client import OpenAICompatibleClient
        from app.services.llm.fallback_client import FallbackLLMClient
        report = load_baseline(args.manifest, args.extraction_report)
        if args.resume_report:
            previous = load_baseline(args.manifest, args.resume_report)
            if [(r["id"], r["raw_text"]) for r in report["samples"]] != [(r["id"], r["raw_text"]) for r in previous["samples"]]:
                raise ValueError("Resume report does not match the frozen extraction")
            report = previous
            report.setdefault("previous_runs", []).append({"report_sha256": hashlib.sha256(args.resume_report.read_bytes()).hexdigest(),
                                                           "run_config": previous.get("run_config"), "timestamp_utc": previous["timestamp_utc"]})
        client = OpenAICompatibleClient(base_url=os.environ["PRIMARY_LLM_BASE_URL"],
            api_key=os.environ["PRIMARY_LLM_API_KEY"], model=os.environ["PRIMARY_LLM_MODEL"],
            max_retries=0, max_tokens=args.max_output_tokens, temperature=0)
        report = asyncio.run(measure_proposals(report,
            OcrReviewService(FallbackLLMClient(client, fallback_enabled=False)), args.max_provider_calls))
        report["run_config"] = {"requested_model": os.environ["PRIMARY_LLM_MODEL"],
            "max_provider_calls": args.max_provider_calls, "max_output_tokens_per_call": args.max_output_tokens,
            "retries": 0, "fallback": False, "labels_sent_to_provider": False,
            "extraction_report_sha256": hashlib.sha256(args.extraction_report.read_bytes()).hexdigest()}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        if args.markdown_output:
            write_markdown(report, args.markdown_output)
        return 0
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
