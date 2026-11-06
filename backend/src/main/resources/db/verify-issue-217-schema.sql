DO $schema_check$
DECLARE
    users_table regclass := to_regclass('users');
    claims_table regclass := to_regclass('device_token_claims');
    required record;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class t
        JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid
        JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE t.oid = users_table AND t.relkind = 'r'
          AND a.attname = 'session_version' AND NOT a.attisdropped
          AND a.atttypid = 'pg_catalog.int8'::regtype AND a.attnotnull
          AND pg_get_expr(d.adbin, d.adrelid) IN ('0', '0::bigint', '(0)::bigint', '''0''::bigint')
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2171',
            MESSAGE = '001: users.session_version에 BIGINT NOT NULL DEFAULT 0이 필요합니다.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class claims
        JOIN pg_catalog.pg_class users ON users.relnamespace = claims.relnamespace
        WHERE claims.oid = claims_table AND claims.relkind = 'r' AND users.oid = users_table
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2172',
            MESSAGE = '002: users와 같은 스키마에 device_token_claims가 필요합니다.';
    END IF;

    FOR required IN
        SELECT * FROM (VALUES
            ('id', 'bigint', true),
            ('token_hash', 'character varying(64)', true),
            ('user_id', 'bigint', true),
            ('session_version', 'bigint', true),
            ('latest_claim', 'boolean', false)
        ) AS expected(column_name, column_type, not_null)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = claims_table AND a.attname = required.column_name AND NOT a.attisdropped
              AND format_type(a.atttypid, a.atttypmod) = required.column_type
              AND a.attnotnull = required.not_null
              AND (required.column_name <> 'id' OR a.attidentity IN ('a', 'd'))
        ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P2172',
                MESSAGE = format('002: device_token_claims.%s의 열 정의가 다릅니다.', required.column_name);
        END IF;
    END LOOP;

    FOR required IN
        SELECT * FROM (VALUES
            (users_table, 'uk_users_device_token', 'u', ARRAY['device_token']),
            (claims_table, 'device_token_claims_pkey', 'p', ARRAY['id']),
            (claims_table, 'uk_device_token_claims_token_user', 'u', ARRAY['token_hash', 'user_id']),
            (claims_table, 'uk_device_token_claims_latest', 'u', ARRAY['token_hash', 'latest_claim']),
            (claims_table, 'fk_device_token_claims_user', 'f', ARRAY['user_id'])
        ) AS expected(table_oid, constraint_name, constraint_type, column_names)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_constraint c
            WHERE c.conrelid = required.table_oid AND c.conname = required.constraint_name
              AND c.contype::text = required.constraint_type AND c.convalidated AND NOT c.condeferrable
              AND c.conkey = ARRAY(
                  SELECT a.attnum
                  FROM unnest(required.column_names) WITH ORDINALITY AS expected(column_name, position)
                  JOIN pg_catalog.pg_attribute a
                    ON a.attrelid = c.conrelid AND a.attname = expected.column_name AND NOT a.attisdropped
                  ORDER BY expected.position
              )
              AND (
                  (c.contype IN ('p', 'u') AND EXISTS (
                      SELECT 1 FROM pg_catalog.pg_index i
                      WHERE i.indexrelid = c.conindid
                        AND i.indisvalid AND i.indisready AND i.indislive AND NOT i.indnullsnotdistinct
                  ))
                  OR (c.contype = 'f' AND c.confrelid = users_table AND c.confdeltype = 'c'
                      AND c.confkey = ARRAY(
                          SELECT a.attnum FROM pg_catalog.pg_attribute a
                          WHERE a.attrelid = users_table AND a.attname = 'id' AND NOT a.attisdropped
                      ))
              )
        ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P2172',
                MESSAGE = format('002: %s 제약이 없거나 정의가 다릅니다.', required.constraint_name);
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        WHERE c.conrelid = claims_table AND c.conname = 'ck_device_token_claims_latest'
          AND c.contype = 'c' AND c.convalidated
          AND regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]()]', '', 'g')
              = 'latest_claimisnullorlatest_claim'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2172',
            MESSAGE = '002: ck_device_token_claims_latest 제약이 없거나 정의가 다릅니다.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM users u
        WHERE u.device_token IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM device_token_claims c
            WHERE c.token_hash = encode(sha256(convert_to(u.device_token, 'UTF8')), 'hex')
              AND c.user_id = u.id AND c.session_version = u.session_version AND c.latest_claim IS TRUE
        )
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2172',
            MESSAGE = '002: 현재 FCM 등록과 일치하는 소유권 이력이 필요합니다.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = claims_table AND a.attname = 'confirmed_session_version' AND NOT a.attisdropped
          AND a.atttypid = 'pg_catalog.int8'::regtype AND NOT a.attnotnull AND NOT a.atthasdef
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2173',
            MESSAGE = '003: 확인 세대는 기본값 없이 NULL을 허용하는 BIGINT여야 합니다.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint c
        WHERE c.conrelid = claims_table AND c.conname = 'ck_device_token_claims_confirmation'
          AND c.contype = 'c' AND c.convalidated
          AND regexp_replace(lower(pg_get_expr(c.conbin, c.conrelid)), '[[:space:]()]', '', 'g')
              = 'confirmed_session_versionisnullorlatest_claimistrueandconfirmed_session_version=session_version'
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P2173',
            MESSAGE = '003: ck_device_token_claims_confirmation 제약이 없거나 정의가 다릅니다.';
    END IF;
END
$schema_check$;
