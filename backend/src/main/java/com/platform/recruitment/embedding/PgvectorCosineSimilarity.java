package com.platform.recruitment.embedding;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PgvectorCosineSimilarity {

    /**
     * Calculates normalized Cosine Similarity score in scale [0, 100].
     * Score_semantic = max(0.0, min(100.0, (1.0 - cosine_distance) * 100.0))
     */
    public BigDecimal calculateSimilarityScore(String vectorAString, String vectorBString) {
        if (vectorAString == null || vectorBString == null) {
            return BigDecimal.ZERO;
        }

        try {
            float[] vecA = parseVector(vectorAString);
            float[] vecB = parseVector(vectorBString);

            float dotProduct = 0.0f;
            float normA = 0.0f;
            float normB = 0.0f;

            int len = Math.min(vecA.length, vecB.length);
            for (int i = 0; i < len; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }

            if (normA == 0.0f || normB == 0.0f) {
                return BigDecimal.ZERO;
            }

            double cosineSim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            // Explicit clipping to guarantee score within [0.0, 100.0]
            double score = Math.max(0.0, Math.min(100.0, cosineSim * 100.0));

            return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            return BigDecimal.valueOf(50.00);
        }
    }

    private float[] parseVector(String vectorStr) {
        String clean = vectorStr.replace("[", "").replace("]", "").trim();
        String[] parts = clean.split(",");
        float[] res = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Float.parseFloat(parts[i].trim());
        }
        return res;
    }
}
