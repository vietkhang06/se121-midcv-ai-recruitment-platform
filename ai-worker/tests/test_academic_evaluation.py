import pytest
from app.evaluation.eval_runner import run_evaluation, compute_extraction_metrics, compute_ndcg_at_k
from app.services.normalizer import normalize_skill_name
from app.services.cache_service import cache_service

def test_extraction_precision_recall_f1():
    """Verify that extraction evaluation achieves empirical baseline (Recall 100%, F1 > 80%)."""
    results = run_evaluation()
    assert results["macro_f1"] >= 0.80, f"Macro F1 score {results['macro_f1']} fell below 0.80 baseline"
    assert results["macro_precision"] >= 0.70, f"Macro Precision {results['macro_precision']} fell below 0.70 baseline"
    assert results["macro_recall"] >= 0.95, f"Macro Recall {results['macro_recall']} fell below 0.95 baseline"

def test_ranking_ndcg_evaluation():
    """Verify that candidate ranking produces high NDCG@3 and NDCG@5 scores against ground truth."""
    results = run_evaluation()
    assert results["ndcg_at_3"] >= 0.90, f"NDCG@3 {results['ndcg_at_3']} fell below 0.90 threshold"
    assert results["ndcg_at_5"] >= 0.90, f"NDCG@5 {results['ndcg_at_5']} fell below 0.90 threshold"
    assert results["precision_at_3"] >= 0.80, f"Precision@3 {results['precision_at_3']} fell below 0.80 threshold"

def test_synonymous_skill_normalization():
    """Verify that synonymous technology aliases normalize to canonical representations."""
    test_cases = [
        ("JS", "JavaScript"),
        ("javascript", "JavaScript"),
        ("TS", "TypeScript"),
        ("typescript", "TypeScript"),
        ("postgres", "PostgreSQL"),
        ("postgresql", "PostgreSQL"),
        ("k8s", "Kubernetes"),
        ("kubernetes", "Kubernetes"),
        ("react.js", "React"),
        ("reactjs", "React"),
        ("springboot", "Spring Boot"),
        ("spring framework", "Spring Boot"),
        ("golang", "Go")
    ]
    for raw, expected in test_cases:
        assert normalize_skill_name(raw) == expected, f"Failed alias mapping for {raw} -> expected {expected}"

def test_memory_cache_service():
    """Verify that cache service stores, retrieves, and purges entries accurately."""
    cache_service.clear()
    assert cache_service.size() == 0

    cache_service.set("TEST", "input text", {"result": "ok"}, ttl_seconds=10)
    assert cache_service.size() == 1

    cached = cache_service.get("TEST", "input text")
    assert cached == {"result": "ok"}

    missing = cache_service.get("TEST", "other text")
    assert missing is None
