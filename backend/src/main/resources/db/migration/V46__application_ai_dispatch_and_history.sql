-- APP-AI: durable dispatch intent is committed with the application, not with queue/provider work.
-- Historical applications are not assigned invented submission policies or dispatch intents.
ALTER TABLE applications ADD COLUMN ai_dispatch_pending BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN ai_policy_snapshot TEXT;
ALTER TABLE applications ADD COLUMN ai_requested_policy_snapshot TEXT;
CREATE INDEX idx_app_ai_pending_dispatch ON applications(id) WHERE ai_dispatch_pending=true;
CREATE TABLE application_match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    match_result_id UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result_snapshot JSONB NOT NULL,
    factor_snapshot JSONB NOT NULL,
    evidence_snapshot JSONB NOT NULL
);
CREATE INDEX idx_app_match_history ON application_match_history(application_id, recorded_at);
