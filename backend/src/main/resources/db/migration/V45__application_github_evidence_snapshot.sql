-- New applications pin the GitHub handle at submission. No invented historical backfill.
ALTER TABLE applications ADD COLUMN ai_scoring_eligible_snapshot BOOLEAN;
ALTER TABLE applications ADD COLUMN github_username_snapshot VARCHAR(39);
ALTER TABLE applications ADD COLUMN github_snapshot_contract VARCHAR(32);
ALTER TABLE applications ADD COLUMN github_scan_snapshot TEXT;
ALTER TABLE match_results ADD COLUMN github_assessment_snapshot TEXT;
