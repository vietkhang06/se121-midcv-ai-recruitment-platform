-- Run with: psql -X -v ON_ERROR_STOP=1 -f scripts/verify_midcv_pgvector_live.sql
-- READ-ONLY live acceptance. Requires a REAL completed application with both vectors
-- and semantic_method recorded as PGVECTOR_COSINE_SIMILARITY.
\set ON_ERROR_STOP on
DO $midcv$
DECLARE
    candidate_application uuid;
    live_score double precision;
BEGIN
    SELECT a.id, greatest(0.0, least(100.0, (1.0 - (cv.embedding <=> jd.embedding)) * 100.0))
      INTO candidate_application, live_score
      FROM applications a
      JOIN match_results m ON m.application_id = a.id
      JOIN document_versions cv ON cv.id = a.applied_cv_version_id
      JOIN document_versions jd ON jd.id = a.applied_jd_version_id
     WHERE cv.embedding IS NOT NULL
       AND jd.embedding IS NOT NULL
       AND cv.state = 'READY' AND jd.state = 'READY'
       AND cv.embedding_model = jd.embedding_model
       AND cv.embedding_dimension = 1024 AND jd.embedding_dimension = 1024
       AND cv.embedding_source_sha IS NOT NULL AND jd.embedding_source_sha IS NOT NULL
       AND m.semantic_method = 'PGVECTOR_COSINE_SIMILARITY'
     ORDER BY a.applied_at DESC
     LIMIT 1;
    IF candidate_application IS NULL OR live_score IS NULL THEN
        RAISE EXCEPTION 'LIVE_PGVECTOR_NOT_ACCEPTED: No completed application with 2 compatible real vectors and recorded PGVECTOR_COSINE_SIMILARITY. Run Candidate->Quick Apply->wait for EMBED/MATCH first.';
    END IF;
    RAISE NOTICE 'LIVE_PGVECTOR_ACCEPTED application=% similarity_score=%.', candidate_application, live_score;
END $midcv$;

-- Diagnostic rows (no PII, no vector contents or API secrets)
SELECT a.id AS application_id, m.semantic_method,
       cv.embedding_model AS cv_model, jd.embedding_model AS jd_model,
       cv.embedding_dimension AS cv_dim, jd.embedding_dimension AS jd_dim,
       m.cv_version_id, m.jd_version_id,
       cv.embedding_generated_at AS cv_generated_at, jd.embedding_generated_at AS jd_generated_at
FROM applications a
JOIN match_results m ON m.application_id = a.id
LEFT JOIN document_versions cv ON cv.id = a.applied_cv_version_id
LEFT JOIN document_versions jd ON jd.id = a.applied_jd_version_id
ORDER BY a.applied_at DESC LIMIT 10;
