-- Retired evidence may still be needed by an immutable submitted application.
ALTER TABLE cv_evidence_attachments ADD COLUMN retired BOOLEAN NOT NULL DEFAULT FALSE;
-- Preserve legacy duplicates as history; the latest row remains current.
WITH ranked AS (
 SELECT id, ROW_NUMBER() OVER(PARTITION BY cv_id,item_type,item_id ORDER BY created_at DESC,id DESC) n
 FROM cv_evidence_attachments
)
UPDATE cv_evidence_attachments SET retired=TRUE WHERE id IN (SELECT id FROM ranked WHERE n>1);
CREATE UNIQUE INDEX uq_cv_evidence_current ON cv_evidence_attachments(cv_id,item_type,item_id) WHERE retired=FALSE;

CREATE FUNCTION midcv_guard_application_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.application_id IS DISTINCT FROM OLD.application_id
 OR NEW.cv_title IS DISTINCT FROM OLD.cv_title
 OR NEW.raw_text_snapshot IS DISTINCT FROM OLD.raw_text_snapshot
 OR NEW.structured_json_snapshot IS DISTINCT FROM OLD.structured_json_snapshot
 OR NEW.snapshot_created_at IS DISTINCT FROM OLD.snapshot_created_at THEN
  RAISE EXCEPTION 'Application CV snapshots are immutable';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER trg_application_snapshot_immutable BEFORE UPDATE ON application_cv_snapshots
FOR EACH ROW EXECUTE FUNCTION midcv_guard_application_snapshot();

-- Job editor responsibilities are stored separately from the original JD text.
ALTER TABLE jobs ADD COLUMN responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb;
