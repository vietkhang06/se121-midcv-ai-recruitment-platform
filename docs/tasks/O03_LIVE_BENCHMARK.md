# STT 68 / O03 — labelled benchmark and before/after measurements

## Acceptance evidence

- Dataset: `test-fixtures/labelled-ocr/manifest.json`, five synthetic English/Vietnamese image, blurred image, scanned PDF and native PDF samples. Labels are literal independently authored text, not model-generated answers.
- Actual local extraction: `evidence/ocr-benchmark-review.json`, Tesseract/Poppler container without network. Source document and manifest checksums are recorded.
- Actual primary provider: `evidence/ocr-benchmark-live-primary.json` and `.md`. The provider receives raw OCR only, never labels. Requested model `cx/gpt-6-luna`, returned model `gpt-6-luna` through the user's existing gateway. No key or credential is committed.
- Every sample has raw text, proposed text, CER/WER before and after and a status. Successful proposals include source SHA, edits/offsets, provider/model and token usage. Rejected outputs retain trace and reason.
- Bilingual scanned PDF: CER **0.027140 → 0.016701**, WER **0.168831 → 0.103896**. Four other samples have no proposed changes and unchanged metrics. Do not interpret this small synthetic corpus as production accuracy.

## Findings and fixes from the real run

The first five calls returned four no-op proposals and one rejected proposal. One additional diagnostic call captured the rejected provider response. A prompt clarification in a seventh call produced complete Vietnamese descriptive terms rather than fragments. Validation still incorrectly rejected the `:` following a descriptive heading. The validator now permits heading punctuation while rejecting email, URL and host/port contexts.

The exact seventh response was revalidated locally after that fix, using the same runtime validation function and source SHA. No additional API request was made for revalidation. `previous_attempts`, `previous_runs`, output hashes and `local_revalidation` disclose the earlier rejected attempts; this is not seven independent dataset evaluations. The initial rejected response predates trace capture, so its token usage is unavailable. Seven total requests, output cap 1024 each, no automatic retry/fallback. No monetary cost claim is made from incomplete gateway billing information.

The four accepted edits restore accents in descriptive terms only. Names, employers, technical skills, dates and contacts remain unchanged. An after measurement is a **validated proposal preview**. It does not confirm, apply, save or change any CV. The existing explicit confirmation contract remains enforced by tests.

## Reproduce without API usage

Validation of this correction: **53 tests passed**, covering the OpenAI-compatible request/provider chain, OCR confirmation and source binding, Vietnamese typography, heading versus contact punctuation, budget gates, independent-label metrics, rejected/no-op proposals and saved-response revalidation. One existing Starlette deprecation warning remains. Local revalidation CLI also passed with zero API requests. No full-stack or all-task acceptance claim is made from this test subset.

From the repository root, with the AI worker dependencies installed:

```powershell
.venv/Scripts/python.exe ai-worker/scripts/benchmark_ocr.py --manifest test-fixtures/labelled-ocr/manifest.json --resume-report docs/tasks/evidence/ocr-benchmark-live-primary.json --revalidate-saved --output diagnostics/ocr-revalidated.json --markdown-output diagnostics/ocr-revalidated.md
```

The output parent must exist. The runner refuses changed document/manifest checksums or a stale response source. When source line endings change across operating systems, regenerate extraction locally rather than changing a recorded checksum to bypass validation.

## Repeat with a configured real API

Configure `PRIMARY_LLM_BASE_URL`, `PRIMARY_LLM_MODEL` and `PRIMARY_LLM_API_KEY` privately in the process environment, then:

```powershell
.venv/Scripts/python.exe ai-worker/scripts/benchmark_ocr.py --manifest test-fixtures/labelled-ocr/manifest.json --extraction-report docs/tasks/evidence/ocr-benchmark-review.json --review-primary --max-provider-calls 5 --max-output-tokens 1024 --output diagnostics/ocr-live.json --markdown-output diagnostics/ocr-live.md
```

Default mode never calls an LLM. Live mode validates the full frozen extraction baseline before any provider call and refuses an insufficient call budget. `--resume-report` reuses measured successes and retries only rejected/missing samples. Authentication/transport failures stop the run. This benchmark covers O03 and the primary OCR-review path; it does not establish live acceptance of all fourteen tasks or real-provider fallback.
