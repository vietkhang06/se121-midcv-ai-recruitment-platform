"""Synthetic behavioral contracts; no external provider or production database."""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from pydantic import ValidationError
from app.evaluation.quality_metrics import ranking_metrics

def test_metrics_are_not_perfect_when_best_candidate_is_omitted():
    result = ranking_metrics(["weak"], {"best": 3, "weak": 0}, 1)
    assert result["ndcg"] == 0 and result["recall"] == 0
    assert result["missing_ids"] == ["best"]
    assert ranking_metrics(["best", "weak"], {"best": 3, "weak": 0}, 1)["ndcg"] == 1
    with pytest.raises(ValueError):
        ranking_metrics(["best", "best"], {"best": 3}, 1)
    with pytest.raises(ValueError):
        ranking_metrics(["unknown"], {"best": 3}, 1)
