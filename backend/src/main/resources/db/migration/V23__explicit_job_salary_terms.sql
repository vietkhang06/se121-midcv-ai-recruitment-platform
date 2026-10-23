ALTER TABLE jobs ADD COLUMN salary_negotiable BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN jobs.min_salary IS 'Monthly VND amount; numeric value is stored without scaling.';
COMMENT ON COLUMN jobs.max_salary IS 'Monthly VND amount; numeric value is stored without scaling.';
COMMENT ON COLUMN jobs.salary_negotiable IS 'True only when recruiter explicitly selected negotiable; null amounts with false means undisclosed.';
