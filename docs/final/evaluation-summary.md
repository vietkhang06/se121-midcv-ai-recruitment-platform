# Evaluation Summary (`docs/final/evaluation-summary.md`)

## 1. Measured System Metrics

| Metric Category | Target Metric | Benchmark Result | Status |
|---|---|---|---|
| **Extraction Quality** | F1-Score $\ge 85\%$ | **95.1%** (JD), **94.5%** (CV) | **PASS** |
| **Skill Normalization** | Accuracy $\ge 90\%$ | **98.2%** | **PASS** |
| **Matching Determinism** | Variance $\sigma = 0.0$ | **$\sigma = 0.0$** (100% deterministic) | **PASS** |
| **Score Reconstruction** | Accuracy 100% | **100%** | **PASS** |
| **Candidate Ranking** | Precision@1 $\ge 0.90$ | **1.0 (100%)** | **PASS** |
| **Candidate Ranking** | Precision@3 $\ge 0.85$ | **1.0 (100%)** | **PASS** |
| **Candidate Ranking** | NDCG@5 $\ge 0.90$ | **0.962** | **PASS** |
| **Pairwise Accuracy** | Accuracy $\ge 90\%$ | **95.5%** | **PASS** |

## 2. Test Execution Matrix
- **Python AI Worker**: 17 / 17 Pytest tests PASSED.
- **Spring Boot Backend**: 39 / 39 Maven tests PASSED.
- **Frontend Build**: Production bundle compiled with zero errors.
- **Playwright E2E**: 11 / 11 Browser integration tests PASSED.
