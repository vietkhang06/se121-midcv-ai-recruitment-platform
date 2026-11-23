ALTER TABLE jobs ADD COLUMN published_at TIMESTAMPTZ;

-- Earlier jobs have no reliable publication timestamp. Leave that history unknown.
CREATE FUNCTION midcv_record_first_job_publication() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'PUBLISHED' AND NEW.published_at IS NULL THEN
        IF TG_OP = 'INSERT' THEN
            NEW.published_at := statement_timestamp();
        ELSIF OLD.status = 'DRAFT' THEN
            NEW.published_at := statement_timestamp();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_record_first_publication
BEFORE INSERT OR UPDATE OF status ON jobs
FOR EACH ROW EXECUTE FUNCTION midcv_record_first_job_publication();
