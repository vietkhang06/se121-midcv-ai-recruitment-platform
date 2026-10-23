ALTER TABLE github_profiles
    ADD COLUMN ownership_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED_PUBLIC'
    CHECK (ownership_status IN ('OWNED', 'UNVERIFIED_PUBLIC'));

UPDATE github_profiles SET ownership_status = 'UNVERIFIED_PUBLIC';
