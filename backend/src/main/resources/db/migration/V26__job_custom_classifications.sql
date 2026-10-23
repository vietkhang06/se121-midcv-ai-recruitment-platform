ALTER TABLE jobs ADD COLUMN industry_other VARCHAR(80);
ALTER TABLE jobs ADD COLUMN seniority_other VARCHAR(80);
ALTER TABLE jobs ADD COLUMN employment_type_other VARCHAR(80);

COMMENT ON COLUMN jobs.industry_other IS 'Trimmed user supplied industry text, populated only when industry is OTHER.';
COMMENT ON COLUMN jobs.seniority_other IS 'Trimmed user supplied seniority text, populated only when seniority is OTHER.';
COMMENT ON COLUMN jobs.employment_type_other IS 'Trimmed user supplied employment type text, populated only when employment_type is OTHER.';
