-- Keep one ACTIVE cache row for an immutable entity/model/source binding.
-- The service also takes a transaction-scoped advisory lock so concurrent misses
-- do not waste provider work or race on this constraint.
WITH ranked AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY entity_type, entity_id, model_provider, model_name,
                            model_version, dimension, source_sha256
               ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS row_number
    FROM embeddings
    WHERE status = 'ACTIVE' AND source_sha256 IS NOT NULL
)
UPDATE embeddings e
SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
FROM ranked r
WHERE e.id = r.id AND r.row_number > 1;

CREATE UNIQUE INDEX uq_embeddings_active_source_binding
    ON embeddings(entity_type, entity_id, model_provider, model_name,
                  model_version, dimension, source_sha256)
    WHERE status = 'ACTIVE' AND source_sha256 IS NOT NULL;
