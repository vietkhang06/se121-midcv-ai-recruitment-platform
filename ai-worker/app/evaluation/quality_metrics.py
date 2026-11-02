"""Metrics only. Predictions must come from the product, independently of labels."""
import math
import re
import unicodedata


def edit_distance(reference, prediction):
    previous = list(range(len(prediction) + 1))
    for i, left in enumerate(reference, 1):
        current = [i]
        for j, right in enumerate(prediction, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (left != right)))
        previous = current
    return previous[-1]


def text_error_rates(reference: str, prediction: str) -> dict:
    # NFC and whitespace normalization only; accents/case/punctuation remain significant.
    normalize = lambda text: re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()
    reference, prediction = normalize(reference), normalize(prediction)
    if not reference:
        raise ValueError("Ground truth must contain text")
    words = reference.split()
    return {"cer": edit_distance(reference, prediction) / len(reference),
            "wer": edit_distance(words, prediction.split()) / len(words)}


def ranking_metrics(predicted_ids: list[str], labels: dict[str, int], k: int) -> dict:
    if k <= 0 or not labels:
        raise ValueError("A positive k and independent relevance labels are required")
    if len(set(predicted_ids)) != len(predicted_ids) or set(predicted_ids) - set(labels):
        raise ValueError("Duplicate or unlabelled backend candidates")
    if any(isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 3 for value in labels.values()):
        raise ValueError("Relevance labels must be integers from 0 to 3")
    dcg = lambda values: sum((2 ** value - 1) / math.log2(index + 2) for index, value in enumerate(values[:k]))
    actual = [labels[item] for item in predicted_ids]
    ideal = sorted(labels.values(), reverse=True)  # All labels, including candidates omitted by the engine.
    ideal_dcg = dcg(ideal)
    relevant = sum(value >= 2 for value in actual[:k])
    total_relevant = sum(value >= 2 for value in labels.values())
    return {"k": k, "ndcg": dcg(actual) / ideal_dcg if ideal_dcg else 0.0,
            "precision": relevant / k, "recall": relevant / total_relevant if total_relevant else 0.0,
            "label_count": len(labels), "prediction_count": len(predicted_ids),
            "missing_ids": sorted(set(labels) - set(predicted_ids))}
