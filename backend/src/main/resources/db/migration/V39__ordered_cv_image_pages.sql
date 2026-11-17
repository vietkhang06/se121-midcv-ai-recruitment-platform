CREATE TABLE cv_source_page_sets (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL CHECK (status IN ('UPLOADED','DRAFT_CREATED')),
    cv_id UUID UNIQUE REFERENCES cvs(id),
    cv_version_id UUID REFERENCES cv_versions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cv_source_pages (
    id UUID PRIMARY KEY,
    set_id UUID NOT NULL REFERENCES cv_source_page_sets(id),
    document_id UUID NOT NULL REFERENCES documents(id),
    document_version_id UUID NOT NULL REFERENCES document_versions(id),
    page_order INTEGER NOT NULL CHECK (page_order > 0),
    revision INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(16) NOT NULL CHECK (status IN ('READY','FAILED','REMOVED')),
    extracted_text TEXT,
    error_code VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cv_source_pages_set_order_idx ON cv_source_pages(set_id,page_order);

CREATE TABLE cv_version_source_pages (
    cv_version_id UUID NOT NULL REFERENCES cv_versions(id),
    source_page_id UUID NOT NULL REFERENCES cv_source_pages(id),
    page_order INTEGER NOT NULL CHECK (page_order > 0),
    PRIMARY KEY (cv_version_id, source_page_id),
    UNIQUE (cv_version_id, page_order)
);

CREATE TABLE application_cv_snapshot_pages (
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    source_page_id UUID NOT NULL REFERENCES cv_source_pages(id),
    source_document_version_id UUID NOT NULL REFERENCES document_versions(id),
    page_order INTEGER NOT NULL CHECK (page_order > 0),
    filename_snapshot VARCHAR(255) NOT NULL,
    media_type_snapshot VARCHAR(100) NOT NULL,
    size_bytes_snapshot BIGINT NOT NULL,
    sha256_snapshot CHAR(64) NOT NULL,
    extracted_text_snapshot TEXT NOT NULL,
    PRIMARY KEY (application_id, source_page_id),
    UNIQUE (application_id, page_order)
);

CREATE FUNCTION midcv_guard_application_snapshot_pages() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Application source page snapshots are immutable';
END;
$$;
CREATE TRIGGER trg_application_snapshot_pages_immutable
BEFORE UPDATE OR DELETE ON application_cv_snapshot_pages
FOR EACH ROW EXECUTE FUNCTION midcv_guard_application_snapshot_pages();
