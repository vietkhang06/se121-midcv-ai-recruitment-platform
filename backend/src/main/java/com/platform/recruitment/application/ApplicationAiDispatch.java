package com.platform.recruitment.application;

import com.platform.recruitment.worker.JobQueue;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Durable outbox on the application row. Queue insertion and clearing the intent commit together. */
@Service
@RequiredArgsConstructor
public class ApplicationAiDispatch {
    private final JdbcTemplate jdbc;
    private final JobQueue queue;

    @Transactional
    public void dispatchOne() {
        var rows = jdbc.queryForList("""
            SELECT a.id, c.user_id, a.applied_cv_version_id, a.applied_jd_version_id,
                   d.owner_id AS jd_owner, a.ai_analysis_consent, a.ai_scoring_eligible_snapshot, a.status
              FROM applications a JOIN candidate_profiles c ON c.id=a.candidate_id
              LEFT JOIN documents d ON d.id=a.job_id AND d.kind='JD'
             WHERE a.ai_dispatch_pending=true
               AND NOT EXISTS (SELECT 1 FROM processing_jobs p WHERE p.kind='MATCH' AND p.entity_id=a.id
                               AND p.state IN ('QUEUED','RUNNING'))
             ORDER BY a.created_at, a.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED
            """);
        if (rows.isEmpty()) return;
        var row = rows.getFirst();
        UUID id = (UUID) row.get("id");
        if (Boolean.TRUE.equals(row.get("ai_analysis_consent"))
                && Boolean.TRUE.equals(row.get("ai_scoring_eligible_snapshot"))
                && !"WITHDRAWN".equals(row.get("status"))) {
            UUID owner = (UUID) row.get("user_id");
            // Generate checks current model/hash and returns without provider calls for a valid vector.
            // Missing legacy pins are not replaced with a live CV/JD.
            UUID cv = (UUID) row.get("applied_cv_version_id");
            UUID jd = (UUID) row.get("applied_jd_version_id");
            if (cv != null) queue.enqueue(owner, "EMBED", cv);
            if (jd != null && row.get("jd_owner") != null) queue.enqueue((UUID) row.get("jd_owner"), "EMBED", jd);
            queue.enqueue(owner, "MATCH", id);
        }
        jdbc.update("UPDATE applications SET ai_dispatch_pending=false WHERE id=?", id);
    }

    /** Repair the lost-wakeup case when an embedding completes while MATCH is still RUNNING.
     * At most one automatic promotion per new embedding generation; no infinite terminal retry. */
    @Transactional
    public void promoteOne() {
        var rows = jdbc.queryForList("""
            SELECT a.id, c.user_id FROM applications a
              JOIN candidate_profiles c ON c.id=a.candidate_id
              JOIN match_results m ON m.application_id=a.id
              JOIN document_versions cv ON cv.id=a.applied_cv_version_id
              JOIN document_versions jd ON jd.id=a.applied_jd_version_id
              JOIN LATERAL (SELECT p.state,p.created_at FROM processing_jobs p
                            WHERE p.kind='MATCH' AND p.entity_id=a.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) last_match ON true
             WHERE a.ai_analysis_consent=true AND a.ai_scoring_eligible_snapshot IS DISTINCT FROM false
               AND a.status<>'WITHDRAWN' AND a.ai_dispatch_pending=false AND m.status='PENDING_VECTOR'
               AND cv.state='READY' AND jd.state='READY' AND cv.embedding IS NOT NULL AND jd.embedding IS NOT NULL
               AND last_match.state='SUCCEEDED'
               AND last_match.created_at < GREATEST(cv.embedding_generated_at,jd.embedding_generated_at)
               AND NOT EXISTS (SELECT 1 FROM processing_jobs p WHERE p.kind='MATCH' AND p.entity_id=a.id AND p.state IN ('QUEUED','RUNNING'))
             ORDER BY a.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED
            """);
        if (!rows.isEmpty()) {
            var row = rows.getFirst();
            queue.enqueue((UUID) row.get("user_id"), "MATCH", (UUID) row.get("id"));
        }
    }
}
