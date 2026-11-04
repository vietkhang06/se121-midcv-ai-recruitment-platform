-- Additive schema. Original CVs, applications and OAuth data are preserved.
ALTER TABLE users ADD COLUMN auth_invalid_before TIMESTAMPTZ;
CREATE TABLE inbox_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 application_alerts BOOLEAN NOT NULL DEFAULT TRUE, message_alerts BOOLEAN NOT NULL DEFAULT TRUE,
 profile_alerts BOOLEAN NOT NULL DEFAULT TRUE, job_alerts BOOLEAN NOT NULL DEFAULT FALSE,
 email_alerts BOOLEAN NOT NULL DEFAULT FALSE,
 job_keyword VARCHAR(120) NOT NULL DEFAULT '', job_location VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE TABLE inbox_notifications (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind VARCHAR(40) NOT NULL, title VARCHAR(200) NOT NULL, body VARCHAR(1000) NOT NULL,
 href VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, read_at TIMESTAMPTZ
);
CREATE INDEX idx_inbox_notice_user ON inbox_notifications(user_id,created_at DESC,id DESC);
CREATE UNIQUE INDEX uq_inbox_job_alert ON inbox_notifications(user_id,href) WHERE kind='JOB_ALERT';
CREATE TABLE inbox_conversations (
 id UUID PRIMARY KEY, application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
 candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recruiter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 accepted BOOLEAN NOT NULL DEFAULT FALSE, blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(application_id,recruiter_user_id), CHECK(candidate_user_id<>recruiter_user_id)
);
CREATE INDEX idx_inbox_candidate_threads ON inbox_conversations(candidate_user_id,updated_at DESC);
CREATE INDEX idx_inbox_recruiter_threads ON inbox_conversations(recruiter_user_id,updated_at DESC);
CREATE TABLE inbox_messages (
 id UUID PRIMARY KEY, conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
 sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, client_id UUID NOT NULL,
 body VARCHAR(4000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, read_at TIMESTAMPTZ,
 UNIQUE(conversation_id,sender_id,client_id)
);
CREATE INDEX idx_inbox_messages_time ON inbox_messages(conversation_id,created_at DESC,id DESC);
CREATE TABLE inbox_email_outbox (
 id UUID PRIMARY KEY, notification_id UUID NOT NULL UNIQUE REFERENCES inbox_notifications(id) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0, sent_at TIMESTAMPTZ, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE candidate_saved_jobs (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,job_id)
);
CREATE TABLE candidate_cover_letters (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(160) NOT NULL, body VARCHAR(12000) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE candidate_profile_views (
 id UUID PRIMARY KEY, candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recruiter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
 viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(application_id,recruiter_user_id)
);
CREATE TABLE account_upgrade_requests (
 id UUID PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
