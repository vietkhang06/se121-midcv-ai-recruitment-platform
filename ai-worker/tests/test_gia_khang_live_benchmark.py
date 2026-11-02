import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.ocr_review_service import OcrReviewService, OcrProposal, OcrEdit, source_hash, validate_edits
from app.services.llm.openai_compatible_client import OpenAICompatibleClient

spec = importlib.util.spec_from_file_location("benchmark_ocr", Path(__file__).parents[1] / "scripts/benchmark_ocr.py")
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


@pytest.mark.parametrize("before,after", [("Kỹ su", "Kỹ sư"), ("Kinh nghiém", "Kinh nghiệm"), ("quan ly", "quản lý")])
def test_vietnamese_preview_preserves_original_and_requires_source(before, after):
    proposal = OcrProposal(source_sha256=source_hash(before), provider="test", model="test",
        edits=[OcrEdit(start=0, end=len(before), before=before, after=after)])
    assert OcrReviewService.preview_text(before, proposal) == after
    assert proposal.edits[0].before == before
    with pytest.raises(ValueError, match="stale"):
        OcrReviewService.preview_text(before + " changed", proposal)


@pytest.mark.parametrize("before,after", [("Nguyen", "Nguyễn"), ("Java", "JavaScript"), ("kinh nghiem", "kỹ năng"), ("2020", "2021")])
def test_preview_rejects_unapproved_facts(before, after):
    with pytest.raises(ValueError):
        validate_edits(before, [OcrEdit(start=0, end=len(before), before=before, after=after)])


@pytest.mark.asyncio
async def test_metrics_use_independent_labels_and_never_send_them():
    raw = "Kỹ su"
    proposal = OcrProposal(source_sha256=source_hash(raw), provider="test", model="test",
        edits=[OcrEdit(start=0, end=len(raw), before=raw, after="Kỹ sư")])
    service = SimpleNamespace(propose=AsyncMock(return_value=proposal), preview_text=OcrReviewService.preview_text)
    report = {"samples": [{"raw_text": raw, "ground_truth": "Kỹ sư", "before": {"cer": .2, "wer": .5}}]}
    await benchmark.measure_proposals(report, service, 1)
    assert report["samples"][0]["after"] == {"cer": 0, "wer": 0}
    assert service.propose.call_args.args[0].model_dump() == {"raw_text": raw}
    assert report["samples"][0]["approval_state"] == "NOT_CONFIRMED_NO_CV_WRITE"


@pytest.mark.asyncio
async def test_budget_prevents_any_call_and_transport_failure_stops_run():
    service = SimpleNamespace(propose=AsyncMock(side_effect=RuntimeError("transport failed")))
    report = {"samples": [{"raw_text": "x"}, {"raw_text": "y"}]}
    with pytest.raises(ValueError, match="budget"):
        await benchmark.measure_proposals(report, service, 1)
    service.propose.assert_not_called()
    with pytest.raises(RuntimeError):
        await benchmark.measure_proposals(report, service, 2)
    assert service.propose.call_count == 1


def test_frozen_real_baseline_rejects_tampering(tmp_path):
    import json
    manifest = tmp_path / "manifest.json"
    report = tmp_path / "report.json"
    manifest.write_text('{"samples": []}')
    report.write_text(json.dumps({"manifest_sha256": "wrong", "samples": []}))
    with pytest.raises(ValueError, match="Stale"):
        benchmark.load_baseline(manifest, report)


def test_request_token_limit_is_opt_in():
    base = dict(base_url="http://localhost/v1", api_key="test", model="test")
    limited = OpenAICompatibleClient(**base, max_tokens=1024)
    assert limited._build_request([])["max_tokens"] == 1024
    assert "max_tokens" not in OpenAICompatibleClient(**base)._build_request([])
    with pytest.raises(ValueError):
        OpenAICompatibleClient(**base, max_tokens=0)


def test_descriptor_colon_is_allowed_but_contact_context_is_protected():
    raw = "Kinh nghiém: Example"
    edits = OcrReviewService.validated_changes(raw, '{"edits":[{"before":"Kinh nghiém","after":"Kinh nghiệm"}]}')
    assert edits[0].after == "Kinh nghiệm"
    for raw in ("enginecr:443", "https://enginecr", "enginecr@example.com", "host:enginecr"):
        with pytest.raises(ValueError):
            OcrReviewService.validated_changes(raw, '{"edits":[{"before":"enginecr","after":"engineer"}]}')


def test_saved_real_response_revalidation_is_source_bound_and_does_not_call_provider():
    raw = "Kỹ su"
    trace = {"source_sha256": source_hash(raw), "provider": "real-recorded", "model": "recorded-model",
             "usage": {}, "provider_output": '{"edits":[{"before":"Kỹ su","after":"Kỹ sư"}]}'}
    row = {"raw_text": raw, "ground_truth": "Kỹ sư", "before": {"cer": .2, "wer": .5},
           "after": {"cer": .2, "wer": .5}, "after_status": "REJECTED_PROPOSAL_NO_CHANGE", "rejection_trace": trace}
    report = {"samples": [row], "provider_calls": 7}
    benchmark.revalidate_saved_responses(report)
    assert row["after"] == {"cer": 0, "wer": 0} and report["provider_calls"] == 7
    assert row["local_revalidation"]["additional_api_calls"] == 0
    row.update(after_status="REJECTED_PROPOSAL_NO_CHANGE", rejection_trace={**trace, "source_sha256": "stale"})
    with pytest.raises(ValueError, match="stale"):
        benchmark.revalidate_saved_responses(report)


@pytest.mark.asyncio
@pytest.mark.parametrize("reject", [False, True])
async def test_noop_and_unsafe_proposal_are_measured_without_claiming_improvement(reject):
    raw = "Kỹ su"
    proposal = OcrProposal(source_sha256=source_hash(raw), provider="test", model="test", edits=[])
    service = SimpleNamespace(propose=AsyncMock(side_effect=ValueError("unsafe")) if reject else AsyncMock(return_value=proposal),
                              preview_text=OcrReviewService.preview_text)
    before = benchmark.text_error_rates("Kỹ sư", raw)
    report = {"samples": [{"raw_text": raw, "ground_truth": "Kỹ sư", "before": before}]}
    await benchmark.measure_proposals(report, service, 1)
    row = report["samples"][0]
    assert row["after"] == before and row["delta"] == {"cer": 0, "wer": 0}
    assert row["after_status"] == ("REJECTED_PROPOSAL_NO_CHANGE" if reject else "NO_CHANGE_PROPOSED")
