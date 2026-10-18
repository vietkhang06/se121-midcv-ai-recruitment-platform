# MidCV evaluation fixtures

This inventory documents the repository fixtures used for extraction and matching checks. It does not claim production-CV provenance or benchmark accuracy.

## Document extraction

| Fixture | Format / coverage | Expected result source | Known limit |
|---|---|---|---|
| `synthetic/01_single_column_tech_cv.pdf` | Synthetic, one-column, PDF text | `synthetic/expected_outputs.json` and `ai-worker/tests/test_synthetic_fixtures_extraction.py` | Assertions check selected facts, not full-text recall. |
| `synthetic/02_two_column_cv.pdf` | Synthetic, two-column, PDF text | Same expected-output file and extraction test | Reading order is checked only through selected content assertions. |
| `synthetic/03_scanned_cv.pdf` | Synthetic scanned PDF | Same expected-output file | OCR quality is environment-dependent. |
| `synthetic/04_cv_image.png` | Synthetic image document | Same expected-output file | Requires local OCR language resources. |
| `synthetic/05_structured_table_cv.docx` | Synthetic DOCX with structured content | Same expected-output file and extraction test | Does not represent all Word layout variants. |
| `synthetic/06_legacy_cv.doc` | Legacy DOC compatibility/error path | Expected method and fallback error in expected-output file | Graceful failure is not equivalent to successful extraction. |
| `synthetic/07_corrupted_file.pdf` | Corrupt PDF failure path | No expected content declared | Used for error handling, not quality scoring. |
| `synthetic/08_empty_or_low_quality.txt` | Empty/low-quality input path | No expected content declared | Used for quality handling, not OCR scoring. |

`ocr/` contains English, Vietnamese, bilingual, text-layer, scanned, and hybrid fixtures referenced by `ai-worker/tests/test_bilingual_ocr_integration.py`. Their source/anonymization provenance is not recorded in this repository; do not treat them as approved real CVs or send them to an external service without provenance review.

## Matching relevance cases

`ai-worker/app/evaluation/ranking_dataset.json` contains one benchmark job and five candidates with `ground_truth_relevance` labels from 0 to 3. The labeled cases include highly relevant examples and an irrelevant example whose skills have no overlap with the benchmark job's required or preferred skills. The file does not document the data's author/provenance, so treat it as a controlled evaluation fixture, not a real-user dataset or a statistically representative benchmark.

## Reproducible local extraction check

From `ai-worker/`, run:

```powershell
python -B -m pytest -q -p no:cacheprovider tests/test_synthetic_fixtures_extraction.py tests/test_bilingual_ocr_integration.py
```

The bilingual OCR tests use local Tesseract and require both `eng` and `vie` language data. This command does not call the configured LLM provider. Matching quality and extraction quality must be reported separately; this fixture set is too small to support a general accuracy claim.
