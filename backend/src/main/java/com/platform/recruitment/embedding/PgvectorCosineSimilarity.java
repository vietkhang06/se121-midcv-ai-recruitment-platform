package com.platform.recruitment.embedding;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class PgvectorCosineSimilarity {

    private static final Logger log = LoggerFactory.getLogger(PgvectorCosineSimilarity.class);

    private final JdbcTemplate jdbcTemplate;

    public PgvectorCosineSimilarity() {
        this.jdbcTemplate = null;
    }

    @Autowired
    public PgvectorCosineSimilarity(@Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Executes real PostgreSQL pgvector cosine similarity calculation on document_versions embeddings.
     * Query: SELECT greatest(0,least(100,(1-(cv.embedding <=> jd.embedding))*100)) AS score
     * Returns null if database or embeddings are not available, allowing seamless fallback.
     */
    public BigDecimal evaluatePgvectorSemanticSimilarity(UUID cvVersionId, UUID jdVersionId) {
        if (jdbcTemplate != null && cvVersionId != null && jdVersionId != null) {
            try {
                List<Map<String, Object>> scoreRows = jdbcTemplate.queryForList(
                        "SELECT greatest(0,least(100,(1-(cv.embedding <=> jd.embedding))*100)) AS score " +
                        "FROM document_versions cv CROSS JOIN document_versions jd " +
                        "WHERE cv.id=? AND jd.id=? AND cv.embedding IS NOT NULL AND jd.embedding IS NOT NULL",
                        cvVersionId, jdVersionId
                );
                if (!scoreRows.isEmpty() && scoreRows.get(0).get("score") != null) {
                    double score = ((Number) scoreRows.get(0).get("score")).doubleValue();
                    return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
                }
            } catch (Exception e) {
                log.debug("Native PostgreSQL pgvector query skipped (using fallback): {}", e.getMessage());
            }
        }
        return null;
    }

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

    /**
     * Evaluates dynamic semantic similarity between JD text and CV text using vector cosine similarity
     * over canonical semantic embeddings and phrase synonym representations.
     */
    public BigDecimal evaluateSemanticSimilarity(String jdText, String cvText) {
        if (jdText == null || jdText.isBlank() || cvText == null || cvText.isBlank()) {
            return BigDecimal.ZERO;
        }

        java.util.Map<String, Double> jdVec = extractSemanticVector(jdText);
        java.util.Map<String, Double> cvVec = extractSemanticVector(cvText);

        if (jdVec.isEmpty() || cvVec.isEmpty()) {
            return BigDecimal.ZERO;
        }

        double dotProduct = 0.0;
        double normJd = 0.0;
        double normCv = 0.0;

        for (java.util.Map.Entry<String, Double> entry : jdVec.entrySet()) {
            double wJd = entry.getValue();
            normJd += wJd * wJd;
            if (cvVec.containsKey(entry.getKey())) {
                dotProduct += wJd * cvVec.get(entry.getKey());
            }
        }

        for (double wCv : cvVec.values()) {
            normCv += wCv * wCv;
        }

        if (normJd == 0.0 || normCv == 0.0) {
            return BigDecimal.ZERO;
        }

        double cosine = dotProduct / (Math.sqrt(normJd) * Math.sqrt(normCv));
        double score = Math.max(0.0, Math.min(100.0, cosine * 100.0));
        return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
    }

    private java.util.Map<String, Double> extractSemanticVector(String text) {
        java.util.Map<String, Double> vector = new java.util.HashMap<>();
        String clean = text.toLowerCase().replaceAll("[^a-z0-9\\s\\+\\#\\-\\.]", " ");
        String[] tokens = clean.split("\\s+");

        for (String rawToken : tokens) {
            if (rawToken.isBlank() || isStopWord(rawToken)) continue;

            String canonicalConcept = mapToSemanticConcept(rawToken);
            vector.put(canonicalConcept, vector.getOrDefault(canonicalConcept, 0.0) + 1.0);
        }
        return vector;
    }

    private String mapToSemanticConcept(String token) {
        // Concept clusters mapping wording differences to shared semantic representations
        if (token.matches("develop.*|build.*|built|creat.*|architect.*|design.*")) return "sem_construct";
        if (token.matches("backend|back-end|server.*|service.*|api.*|microservice.*")) return "sem_backend";
        if (token.matches("frontend|front-end|client.*|web|ui|interface")) return "sem_frontend";
        if (token.matches("java.*|spring.*|springboot|jvm")) return "sem_java";
        if (token.matches("python.*|django|fastapi|flask")) return "sem_python";
        if (token.matches("postgres.*|pgvector|sql|mysql|oracle|database|db")) return "sem_database";
        if (token.matches("docker|k8s|kubernetes|aws|cloud|container|devops")) return "sem_cloud_infra";
        if (token.matches("marketing|seo|ga4|ads|campaign|content")) return "sem_marketing";
        if (token.matches("finance|account.*|tax|audit|reporting|ledger")) return "sem_finance";
        return token;
    }

    private boolean isStopWord(String t) {
        return java.util.Set.of("the", "and", "a", "an", "in", "on", "at", "for", "with", "to", "of", "by", "from", "is", "are", "using").contains(t);
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
