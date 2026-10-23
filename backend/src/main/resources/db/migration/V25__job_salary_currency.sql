ALTER TABLE jobs ADD COLUMN salary_currency VARCHAR(3) NOT NULL DEFAULT 'VND';

COMMENT ON COLUMN jobs.salary_currency IS 'ISO 4217 currency for min_salary/max_salary. Existing values are monthly VND amounts and remain unchanged.';

ALTER TABLE jobs ADD CONSTRAINT jobs_salary_currency_supported CHECK (
    salary_currency IN ('VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'AUD', 'CAD')
);
