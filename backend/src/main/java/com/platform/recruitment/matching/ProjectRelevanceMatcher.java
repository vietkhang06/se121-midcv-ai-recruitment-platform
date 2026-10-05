package com.platform.recruitment.matching;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ProjectRelevanceMatcher {

    private static final java.util.Set<String> STOP_WORDS = java.util.Set.of(
            "the", "and", "for", "with", "this", "that", "from", "have", "been", "will", "your",
            "của", "và", "các", "cho", "với", "trong", "được", "những", "người", "công", "việc"
    );

    public BigDecimal evaluateProjectRelevance(String jdDescription, String cvRawText) {
        if (cvRawText == null || cvRawText.isBlank() || jdDescription == null || jdDescription.isBlank()) {
            return BigDecimal.ZERO;
        }

        String cvLower = cvRawText.toLowerCase();
        String jdLower = jdDescription.toLowerCase();

        // Extract meaningful tokens (length >= 3, alphabetic or alphanumeric)
        String[] jdTokens = jdLower.split("[\\s,;.:()\\[\\]/\\-]+");
        java.util.Set<String> relevantJdKeywords = new java.util.HashSet<>();
        for (String token : jdTokens) {
            token = token.trim();
            if (token.length() >= 3 && !STOP_WORDS.contains(token)) {
                relevantJdKeywords.add(token);
            }
        }

        if (relevantJdKeywords.isEmpty()) {
            return BigDecimal.ZERO;
        }

        long matchedCount = relevantJdKeywords.stream()
                .filter(cvLower::contains)
                .count();

        double score = ((double) matchedCount / relevantJdKeywords.size()) * 100.0;
        double bounded = Math.max(0.0, Math.min(100.0, score));
        return BigDecimal.valueOf(bounded).setScale(2, RoundingMode.HALF_UP);
    }
}
