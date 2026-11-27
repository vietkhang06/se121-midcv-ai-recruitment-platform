package com.platform.recruitment.application;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/** Read-only, user-safe processing state. Never substitutes a failure with zero or a hiring decision. */
public final class ApplicationAiState {
    private ApplicationAiState() {}
    public static String resolve(Application app, String calculation, JdbcTemplate jdbc) {
        if (!Boolean.TRUE.equals(app.getAiAnalysisConsent())) return "CONSENT_NOT_GIVEN";
        if (Boolean.FALSE.equals(app.getAiScoringEligibleSnapshot())) return "PACKAGE_NOT_ELIGIBLE";
        if ("WITHDRAWN".equals(String.valueOf(app.getStatus()))) return "AI_CANCELLED";
        if (Boolean.TRUE.equals(app.getAiDispatchPending())) return "AI_WAITING_DISPATCH";
        if (jdbc != null && app.getId() != null) {
            var matchJobs = jdbc.queryForList("SELECT state,step FROM processing_jobs WHERE kind='MATCH' AND entity_id=? ORDER BY created_at DESC,id DESC LIMIT 1", app.getId());
            if (!matchJobs.isEmpty()) {
                var latest = matchJobs.getFirst();
                if ("FAILED".equals(latest.get("state"))) return "AI_FAILED";
                if ("QUEUED".equals(latest.get("state"))) return "RETRY_BACKOFF".equals(latest.get("step")) ? "AI_RETRYING" : "AI_QUEUED";
                if ("RUNNING".equals(latest.get("state"))) return "AI_RUNNING";
            }
            if ("PENDING_VECTOR".equals(calculation) || calculation == null) {
                UUID cv = app.getAppliedCvVersion() == null ? null : app.getAppliedCvVersion().getId();
                var embeddings = jdbc.queryForList("SELECT DISTINCT ON (entity_id) entity_id,state FROM processing_jobs WHERE kind='EMBED' AND entity_id IN (?,?) ORDER BY entity_id,created_at DESC,id DESC", cv, app.getAppliedJdVersionId());
                if (embeddings.stream().anyMatch(row -> "FAILED".equals(row.get("state")))) return "AI_VECTOR_FAILED";
            }
        }
        return calculation == null ? "AI_QUEUED" : calculation;
    }
}
