ALTER TABLE jobs
 ADD COLUMN description_html TEXT,
 ADD COLUMN candidate_requirements TEXT,
 ADD COLUMN benefits_content TEXT,
 ADD COLUMN work_address TEXT,
 ADD COLUMN working_time TEXT,
 ADD COLUMN application_instructions TEXT,
 ADD COLUMN application_deadline DATE;
ALTER TABLE applications
 ADD COLUMN ai_analysis_consent BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN ai_consent_at TIMESTAMPTZ,
 ADD COLUMN ai_consent_version VARCHAR(32),
 ADD COLUMN cover_letter TEXT;
-- No retrospective consent is inferred for existing applications.
ALTER TABLE companies
 ADD COLUMN address TEXT,
 ADD COLUMN contact_phone VARCHAR(40),
 ADD COLUMN description_html TEXT,
 ADD COLUMN trust_level INTEGER NOT NULL DEFAULT 2 CHECK (trust_level IN (2,3)),
 ADD COLUMN business_license BYTEA,
 ADD COLUMN business_license_name VARCHAR(255),
 ADD COLUMN business_license_type VARCHAR(80),
 ADD COLUMN license_submitted_at TIMESTAMPTZ;
CREATE TABLE company_cv_views (
 company_id UUID NOT NULL REFERENCES companies(id),
 application_id UUID NOT NULL REFERENCES applications(id),
 viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,application_id)
);
CREATE INDEX idx_apps_consent ON applications(job_id,ai_analysis_consent);

ALTER TABLE jobs ADD COLUMN occupation_codes JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE recruitment_campaigns (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id UUID NOT NULL REFERENCES companies(id),
 name VARCHAR(180) NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED','ARCHIVED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_company ON recruitment_campaigns(company_id);
CREATE TABLE recruitment_campaign_jobs (
 campaign_id UUID NOT NULL REFERENCES recruitment_campaigns(id) ON DELETE CASCADE,
 job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
 PRIMARY KEY(campaign_id,job_id)
);
ALTER TABLE companies ADD COLUMN extra_cv_views INTEGER NOT NULL DEFAULT 0 CHECK(extra_cv_views>=0);
ALTER TABLE jobs ADD COLUMN promoted_until TIMESTAMPTZ;
CREATE TABLE recruiter_wallets (
 company_id UUID PRIMARY KEY REFERENCES companies(id),
 credits INTEGER NOT NULL DEFAULT 0 CHECK(credits>=0)
);
CREATE TABLE recruiter_service_packages (
 code VARCHAR(40) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 credit_cost INTEGER NOT NULL CHECK(credit_cost>0),
 boost_days INTEGER NOT NULL CHECK(boost_days>=0),
 cv_views INTEGER NOT NULL CHECK(cv_views>=0),
 active BOOLEAN NOT NULL DEFAULT true
);
-- MidCV's own configurable credit catalog; these are not TopCV prices.
INSERT INTO recruiter_service_packages VALUES
 ('STANDARD_EXTRA','Standard Extra',20,7,20,true),
 ('MID_ECO_PLUS','Mid Eco Plus',50,14,60,true),
 ('MID_MAX','Mid Max',100,30,150,true);
CREATE TABLE recruiter_credit_transactions (
 id UUID PRIMARY KEY,
 company_id UUID NOT NULL REFERENCES companies(id),
 actor_id UUID NOT NULL REFERENCES users(id),
 delta INTEGER NOT NULL,
 balance_after INTEGER NOT NULL,
 package_code VARCHAR(40),
 job_id UUID REFERENCES jobs(id),
 reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_company ON recruiter_credit_transactions(company_id,created_at DESC);
