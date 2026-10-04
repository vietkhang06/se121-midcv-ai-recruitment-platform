-- V15: Expand match_factors and evidences for explainable, grounded matching audit

-- 1. Add explainable tracking columns to match_factors
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS configured_weight DECIMAL(5, 4);
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS effective_weight DECIMAL(5, 4);
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS weighted_contribution DECIMAL(6, 2);
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AVAILABLE';
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(100);
ALTER TABLE match_factors ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(50) DEFAULT 'v2.0';

-- Backfill legacy records safely
UPDATE match_factors
SET configured_weight = COALESCE(configured_weight, weight),
    effective_weight = COALESCE(effective_weight, weight),
    weighted_contribution = COALESCE(weighted_contribution, ROUND(score * weight, 2)),
    status = COALESCE(status, 'AVAILABLE'),
    calculation_method = COALESCE(calculation_method, 'LEGACY_DETERMINISTIC'),
    algorithm_version = COALESCE(algorithm_version, 'v1.0')
WHERE configured_weight IS NULL OR effective_weight IS NULL;

-- Make non-null where appropriate
ALTER TABLE match_factors ALTER COLUMN status SET NOT NULL;

-- 2. Add grounded requirement and status columns to evidences
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS requirement_id VARCHAR(255);
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS requirement_text TEXT;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS candidate_value TEXT;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS match_status VARCHAR(50) DEFAULT 'MATCH';
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS similarity_confidence DECIMAL(5, 4);

-- Backfill legacy evidences
UPDATE evidences
SET match_status = COALESCE(match_status, 'MATCH')
WHERE match_status IS NULL;

-- 3. Indexes for fast explainability inspection lookups
CREATE INDEX IF NOT EXISTS idx_match_factors_result_status ON match_factors(match_result_id, status);
CREATE INDEX IF NOT EXISTS idx_evidences_result ON evidences(match_result_id);
