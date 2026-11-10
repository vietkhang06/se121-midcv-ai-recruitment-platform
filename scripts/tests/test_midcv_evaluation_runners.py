import importlib.util
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]


def load(relative, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


benchmark = load('evaluation/live_api_benchmark.py', 'midcv_benchmark')
ranking = load('evaluation/production_ranking_metrics.py', 'midcv_ranking')


def test_latency_percentile_nearest_rank():
    assert benchmark.percentile([4, 1, 3, 2], 95) == 4
    assert benchmark.percentile([], 50) is None


def test_grades_and_ranking_are_computed_not_hardcoded():
    labels = [dict(case_id='jd1', candidate_id=x, relevance=y, dataset_version='v1', annotator='reviewer')
              for x, y in [('a', 3), ('b', 0), ('c', 2)]]
    preds = [dict(case_id='jd1', candidate_id=x, score=y, method='HYBRID',
                  source='BACKEND_API', policy_version='v2')
             for x, y in [('a', 98.0), ('b', 2.0), ('c', 87.0)]]
    result = ranking.evaluate(preds, labels, 2)['methods']['HYBRID']
    assert result['ndcg@2'] == 1.0
    assert result['precision@2'] == 1.0
    assert result['pairwise_accuracy'] == 1.0


def test_rejects_fabricated_prediction_source():
    labels = [dict(case_id='jd1', candidate_id='a', relevance=1, dataset_version='v1', annotator='reviewer')]
    preds = [dict(case_id='jd1', candidate_id='a', score=100, method='HYBRID',
                  source='MOCK', policy_version='v2')]
    with pytest.raises(ValueError, match='production backend'):
        ranking.evaluate(preds, labels, 1)


def test_rejects_missing_or_mixed_ground_truth():
    preds = [dict(case_id='jd1', candidate_id='a', score=100, method='HYBRID',
                  source='BACKEND_API', policy_version='v2')]
    labels = [dict(case_id='jd1', candidate_id='b', relevance=1, dataset_version='v1', annotator='reviewer')]
    with pytest.raises(ValueError, match='No independent label'):
        ranking.evaluate(preds, labels, 1)
