package org.cathori.backend.config;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.user.application.NotificationPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionSchemaVerifierIntegrationTest extends IntegrationTestBase {

    @Autowired DataSource dataSource;
    @MockitoBean NotificationPort notificationPort;

    @Test
    @DisplayName("운영 스키마 검사는 각 마이그레이션 누락과 제약 불일치를 차단한다")
    void verifiesMigratedSchemaAndRejectsSchemaDrift() throws Exception {
        String verifier = new ClassPathResource("db/verify-issue-217-schema.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        try (Connection connection = dataSource.getConnection(); Statement sql = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                sql.execute("CREATE SCHEMA issue_217_deploy_test");
                sql.execute("SET LOCAL search_path TO issue_217_deploy_test");
                sql.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, device_token VARCHAR(255))");
                sql.execute("""
                        INSERT INTO users VALUES (1, 'synthetic-duplicate'), (2, 'synthetic-duplicate'),
                                                 (3, 'synthetic-single'), (4, NULL)
                        """);

                assertRejected(connection, sql, verifier, "P2171");
                sql.execute("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
                assertRejected(connection, sql, verifier, "P2171");
                sql.execute("ALTER TABLE users DROP COLUMN session_version");

                sql.execute(Files.readString(Path.of("db/migrations/001-add-user-session-version.sql")));
                assertRejected(connection, sql, verifier, "P2172");
                sql.execute(Files.readString(Path.of("db/migrations/002-isolate-device-token-ownership.sql")));
                assertRejected(connection, sql, verifier, "P2173");
                sql.execute(Files.readString(Path.of("db/migrations/003-confirm-device-token-for-push.sql")));
                sql.execute(verifier);

                try (var rows = sql.executeQuery("SELECT device_token FROM users ORDER BY id")) {
                    for (String token : new String[]{null, null, "synthetic-single", null}) {
                        assertThat(rows.next()).isTrue();
                        assertThat(rows.getString(1)).isEqualTo(token);
                    }
                    assertThat(rows.next()).isFalse();
                }
                try (var rows = sql.executeQuery("SELECT count(*) FROM device_token_claims WHERE latest_claim IS NULL")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getInt(1)).isEqualTo(2);
                }
                try (var rows = sql.executeQuery("SELECT count(*) FROM device_token_claims WHERE confirmed_session_version IS NOT NULL")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getInt(1)).isZero();
                }
                assertRejected(connection, sql,
                        "UPDATE device_token_claims SET confirmed_session_version = session_version WHERE user_id = 1", "23514");

                var migrated = connection.setSavepoint();
                sql.execute("ALTER TABLE users DROP CONSTRAINT uk_users_device_token");
                assertRejected(connection, sql, verifier, "P2172");
                connection.rollback(migrated);

                sql.execute("ALTER TABLE device_token_claims DROP CONSTRAINT fk_device_token_claims_user");
                sql.execute("""
                        ALTER TABLE device_token_claims ADD CONSTRAINT fk_device_token_claims_user
                        FOREIGN KEY (user_id) REFERENCES users (id)
                        """);
                assertRejected(connection, sql, verifier, "P2172");
                connection.rollback(migrated);

                sql.execute("ALTER TABLE device_token_claims DROP CONSTRAINT ck_device_token_claims_latest");
                sql.execute("ALTER TABLE device_token_claims ADD CONSTRAINT ck_device_token_claims_latest CHECK (TRUE)");
                assertRejected(connection, sql, verifier, "P2172");
                connection.rollback(migrated);

                sql.execute("DELETE FROM device_token_claims WHERE user_id = 3");
                assertRejected(connection, sql, verifier, "P2172");
                connection.rollback(migrated);

                sql.execute("ALTER TABLE device_token_claims ALTER COLUMN confirmed_session_version SET DEFAULT 0");
                assertRejected(connection, sql, verifier, "P2173");
                connection.rollback(migrated);

                sql.execute("ALTER TABLE device_token_claims DROP CONSTRAINT ck_device_token_claims_confirmation");
                assertRejected(connection, sql, verifier, "P2173");
                connection.rollback(migrated);

                sql.execute(verifier);
            } finally {
                connection.rollback();
            }
        }
    }

    private static void assertRejected(Connection connection, Statement sql, String verifier, String state)
            throws SQLException {
        var beforeVerification = connection.setSavepoint();
        try {
            assertThatThrownBy(() -> sql.execute(verifier))
                    .isInstanceOfSatisfying(SQLException.class, error -> assertThat(error.getSQLState()).isEqualTo(state));
        } finally {
            connection.rollback(beforeVerification);
            connection.releaseSavepoint(beforeVerification);
        }
    }
}
