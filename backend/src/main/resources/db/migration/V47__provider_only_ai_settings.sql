-- Keep previously configured provider credentials and preserve historical vector metadata.
UPDATE system_ai_settings
SET provider = 'CLOUD_OPENAI_COMPATIBLE',
    embedding_provider = 'CLOUD_OPENAI_COMPATIBLE',
    embedding_model = 'text-embedding-3-small';

ALTER TABLE system_ai_settings
    ALTER COLUMN provider SET DEFAULT 'CLOUD_OPENAI_COMPATIBLE',
    ALTER COLUMN embedding_provider SET DEFAULT 'CLOUD_OPENAI_COMPATIBLE',
    ALTER COLUMN embedding_model SET DEFAULT 'text-embedding-3-small',
    DROP COLUMN ollama_url,
    DROP COLUMN ollama_model;
