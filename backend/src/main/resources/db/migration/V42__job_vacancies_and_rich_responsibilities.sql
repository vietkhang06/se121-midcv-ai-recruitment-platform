ALTER TABLE jobs
    ADD COLUMN responsibilities_html TEXT,
    ADD COLUMN vacancy_count INTEGER,
    ADD CONSTRAINT jobs_vacancy_count_range CHECK (vacancy_count BETWEEN 1 AND 10000);
