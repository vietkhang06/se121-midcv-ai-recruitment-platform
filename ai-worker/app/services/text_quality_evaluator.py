import re
import unicodedata
from typing import Dict, Any, Tuple


class TextQualityEvaluator:
    """
    Evaluates the quality of raw text extracted from documents.
    Does NOT call any LLM.
    Strictly checks:
    - Text length and word count
    - Ratio of unprintable / replacement / corrupted characters
    - Presence of structured document features (lines, tokens)
    - Computes qualityScore in range [0.0, 1.0]
    - Determines if OCR fallback is recommended
    """

    MIN_ACCEPTABLE_CHARS = 40
    MIN_ACCEPTABLE_WORDS = 8
    MAX_CORRUPT_CHAR_RATIO = 0.25

    def evaluate(self, text: str | None) -> Dict[str, Any]:
        if text is None:
            return {
                "characterCount": 0,
                "wordCount": 0,
                "lineCount": 0,
                "corruptCharRatio": 1.0,
                "qualityScore": 0.0,
                "isAcceptable": False,
                "needsOcrFallback": True,
                "reasons": ["Text is null"]
            }

        cleaned = text.strip()
        char_count = len(cleaned)
        words = cleaned.split()
        word_count = len(words)
        lines = [l for l in cleaned.splitlines() if l.strip()]
        line_count = len(lines)

        reasons = []

        if char_count == 0:
            return {
                "characterCount": 0,
                "wordCount": 0,
                "lineCount": 0,
                "corruptCharRatio": 1.0,
                "qualityScore": 0.0,
                "isAcceptable": False,
                "needsOcrFallback": True,
                "reasons": ["Text is empty"]
            }

        # Check for corrupt characters (replacement character \ufffd or weird control characters)
        corrupt_chars = 0
        printable_chars = 0
        for char in cleaned:
            if char == "\ufffd":
                corrupt_chars += 1
            elif unicodedata.category(char).startswith("C") and char not in "\n\r\t":
                corrupt_chars += 1
            else:
                printable_chars += 1

        corrupt_ratio = corrupt_chars / char_count if char_count > 0 else 0.0

        # Quality scoring heuristic:
        # Base score starts at 1.0, penalized by corrupt characters and very short length
        score = 1.0 - (corrupt_ratio * 2.0)

        if char_count < self.MIN_ACCEPTABLE_CHARS:
            score -= 0.4
            reasons.append(f"Insufficient character count ({char_count} < {self.MIN_ACCEPTABLE_CHARS})")

        if word_count < self.MIN_ACCEPTABLE_WORDS:
            score -= 0.3
            reasons.append(f"Insufficient word count ({word_count} < {self.MIN_ACCEPTABLE_WORDS})")

        if corrupt_ratio > self.MAX_CORRUPT_CHAR_RATIO:
            score -= 0.4
            reasons.append(f"High corrupt character ratio ({corrupt_ratio:.2f})")

        score = max(0.0, min(1.0, round(score, 2)))

        is_acceptable = (
            char_count >= self.MIN_ACCEPTABLE_CHARS
            and word_count >= self.MIN_ACCEPTABLE_WORDS
            and corrupt_ratio <= self.MAX_CORRUPT_CHAR_RATIO
        )

        needs_ocr = not is_acceptable or score < 0.5

        return {
            "characterCount": char_count,
            "wordCount": word_count,
            "lineCount": line_count,
            "corruptCharRatio": round(corrupt_ratio, 4),
            "qualityScore": score,
            "isAcceptable": is_acceptable,
            "needsOcrFallback": needs_ocr,
            "reasons": reasons
        }
