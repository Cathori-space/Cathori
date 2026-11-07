ALTER TABLE device_token_claims
    ADD COLUMN confirmed_session_version BIGINT,
    ADD CONSTRAINT ck_device_token_claims_confirmation CHECK (
        confirmed_session_version IS NULL
        OR (latest_claim IS TRUE AND confirmed_session_version = session_version)
    );
