-- The prior application generated UUID links and stored their plaintext in token_hash.
-- Hash existing UUIDs without invalidating links previously sent by email.
UPDATE email_verification_tokens
SET token_hash = encode(sha256(convert_to(token_hash, 'UTF8')), 'hex')
WHERE token_hash ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
