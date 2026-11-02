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
