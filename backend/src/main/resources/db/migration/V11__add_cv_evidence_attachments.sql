-- V11: Add CV evidence attachments for certifications and languages
CREATE TABLE IF NOT EXISTS cv_evidence_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    cv_id UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    cv_version_id UUID REFERENCES cv_versions(id) ON DELETE SET NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('CERTIFICATION', 'LANGUAGE')),
    item_id VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cv_evidence_attachments_candidate_id_idx ON cv_evidence_attachments(candidate_id);
CREATE INDEX IF NOT EXISTS cv_evidence_attachments_cv_id_idx ON cv_evidence_attachments(cv_id);
CREATE INDEX IF NOT EXISTS cv_evidence_attachments_version_id_idx ON cv_evidence_attachments(cv_version_id);
CREATE INDEX IF NOT EXISTS cv_evidence_attachments_item_idx ON cv_evidence_attachments(cv_id, item_type, item_id);
