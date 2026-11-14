-- Applications that consented before the cross-industry scoring policy was
-- introduced may have no match_results row because their occupation code was
-- previously rejected. Queue those real applications once, preserving all
-- package, job-status and consent requirements.
INSERT INTO processing_jobs (
    id, owner_id, kind, entity_id, request_id
)
SELECT
    uuid_generate_v4(),
    cp.user_id,
    'MATCH',
    a.id,
    'migration-v37-ai-consent-backfill'
FROM applications a
JOIN candidate_profiles cp ON cp.id = a.candidate_id
JOIN jobs j ON j.id = a.job_id
LEFT JOIN match_results mr ON mr.application_id = a.id
WHERE a.ai_analysis_consent = TRUE
  AND a.status <> 'WITHDRAWN'
  AND j.status = 'PUBLISHED'
  AND (
      j.ai_screening_policy_version IS NULL
      OR NULLIF(BTRIM(j.ai_screening_package_code), '') IS NOT NULL
  )
  AND mr.id IS NULL
ON CONFLICT (kind, entity_id)
WHERE state IN ('QUEUED', 'RUNNING')
DO NOTHING;
