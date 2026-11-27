-- Read-only evidence; pass psql -v application_id=<uuid> -f scripts/verify_app_ai_state.sql
-- Never dumps CV text, credentials, evidence payload or provider tokens.
BEGIN READ ONLY;
SELECT a.id AS application_id,a.status,a.ai_analysis_consent,a.ai_consent_version,
       a.ai_scoring_eligible_snapshot,a.ai_dispatch_pending,a.applied_cv_version_id,a.applied_jd_version_id,
       a.ai_policy_snapshot::jsonb->>'policyVersion' AS submission_policy_version,
       a.ai_requested_policy_snapshot::jsonb->>'policyVersion' AS rescore_policy_version,
       md5(s.raw_text_snapshot) AS raw_cv_fingerprint,md5(s.structured_json_snapshot) AS reviewed_cv_fingerprint,
       cv.embedding_source_sha AS cv_embedding_sha,jd.source_sha AS jd_source_sha,
       m.status AS match_calculation_status,m.core_score,m.github_score,m.overall_score,
       m.cv_version_id AS scored_cv_version,m.jd_version_id AS scored_jd_version,m.policy_version
FROM applications a LEFT JOIN application_cv_snapshots s ON s.application_id=a.id
LEFT JOIN document_versions cv ON cv.id=a.applied_cv_version_id
LEFT JOIN document_versions jd ON jd.id=a.applied_jd_version_id
LEFT JOIN match_results m ON m.application_id=a.id WHERE a.id=:'application_id'::uuid;
SELECT p.id,p.kind,p.entity_id,p.state,p.step,p.attempts,p.error_code,p.created_at,p.updated_at
FROM processing_jobs p JOIN applications a ON p.entity_id IN (a.id,a.applied_cv_version_id,a.applied_jd_version_id)
WHERE a.id=:'application_id'::uuid AND p.kind IN ('MATCH','EMBED') ORDER BY p.created_at,p.id;
SELECT id,match_result_id,recorded_at,result_snapshot->>'policy_version' AS previous_policy_version,
       result_snapshot->>'status' AS previous_status,jsonb_array_length(factor_snapshot) AS factor_count,
       jsonb_array_length(evidence_snapshot) AS evidence_count
FROM application_match_history WHERE application_id=:'application_id'::uuid ORDER BY recorded_at,id;
COMMIT;
