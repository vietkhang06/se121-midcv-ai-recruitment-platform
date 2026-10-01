-- V10: Expand document_versions state check constraint to support separated extraction and structuring lifecycle
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_state_check;
ALTER TABLE document_versions ADD CONSTRAINT document_versions_state_check
    CHECK (state IN ('QUEUED', 'PROCESSING', 'EXTRACTED', 'READY', 'STRUCTURING_FAILED', 'FAILED'));
