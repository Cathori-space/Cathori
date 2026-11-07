package org.cathori.backend.user.api;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.security.TokenHasher;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.domain.RefreshToken;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.infra.RefreshTokenJpaRepository;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "spring.jpa.open-in-view=true"
})
@Import(DeviceTokenSessionHttpTest.ProbeConfig.class)
@DisplayName("실제 HTTP와 PostgreSQL에서의 기기 토큰 세션 격리")
class DeviceTokenSessionHttpTest extends IntegrationTestBase {

    private static final String DEVICE_TOKEN = "/api/users/device-token";
    private static final String LOGOUT = "/api/auth/logout";
    private static final String REFRESH_LOGOUT = "/api/auth/logout/refresh";
    private static final String REISSUE = "/api/auth/reissue";
    private static final String CONTROLLER = "controller";
    private static final String RESPONSE_READY = "response-ready";
    private static final String PROBE_HEADER = "X-Cathori-Test-Probe";
    private static final String PASSWORD = "synthetic-password!";
    private static final Duration WAIT = Duration.ofSeconds(8);

    @LocalServerPort int port;
    @Value("${jwt.secret-key}") String jwtSecret;
    @Autowired UserJpaRepository users;
    @Autowired RefreshTokenJpaRepository refreshTokens;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TokenHasher tokenHasher;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RequestProbes probes;
    @MockitoBean NotificationPort notificationPort;

    private final HttpClient http = HttpClient.newHttpClient();
    private User memberA;
    private User memberB;

    @BeforeEach
    void createUsers() {
        memberA = saveUser();
        memberB = saveUser();
    }

    @AfterEach
    void cleanup() {
        for (User member : List.of(memberA, memberB)) {
            jdbc.update("DELETE FROM refresh_tokens WHERE user_id = ?", member.getId());
            users.deleteById(member.getId());
        }
    }

    @Test
    @DisplayName("인증을 통과한 PUT도 로그아웃 커밋 이후 재개하면 거부한다")
    void rejectsDelayedPutAfterLogout() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        var delayed = probes.pauseAt(CONTROLLER::equals, memberA.getId());
        var put = http.sendAsync(request("PUT", DEVICE_TOKEN, session.access(),
                Map.of("deviceToken", "delayed-a"), delayed), HttpResponse.BodyHandlers.ofString());

        try {
            delayed.awaitReached();
            assertStatus(send("DELETE", DEVICE_TOKEN, session.access(), null), 204);
            assertThat(deviceToken(memberA)).isNull();
            assertStatus(send("POST", LOGOUT, session.access(), null), 204);
            assertThat(refreshCount(memberA)).isZero();
        } finally {
            delayed.resume();
        }
        var response = put.get(WAIT.toSeconds(), TimeUnit.SECONDS);
        assertThat(response.statusCode()).withFailMessage(
                "지연 PUT 상태는 %s, DB 토큰은 %s", response.statusCode(), deviceToken(memberA)).isEqualTo(401);
        assertThat(json.readTree(response.body()).get("code").asText()).isEqualTo("SESSION_INVALID");
        assertThat(deviceToken(memberA)).isNull();
        assertThat(users.findDeviceTokensByIds(List.of(memberA.getId()))).isEmpty();
    }

    @Test
    @DisplayName("PUT이 먼저 행을 잠그면 로그아웃이 대기한 뒤 커밋된 토큰을 지운다")
    void logoutClearsTokenCommittedByEarlierPut() throws Exception {
        var session = login(memberA);
        var writing = probes.pauseAt(sql -> sql.startsWith("update users set "), null);
        var put = http.sendAsync(request("PUT", DEVICE_TOKEN, session.access(),
                Map.of("deviceToken", "first-put"), writing), HttpResponse.BodyHandlers.ofString());
        var logoutEntered = probes.pauseAt(CONTROLLER::equals, null);
        CompletableFuture<HttpResponse<String>> logout;

        try {
            writing.awaitReached();
            logout = http.sendAsync(request("POST", LOGOUT, session.access(), null, logoutEntered),
                    HttpResponse.BodyHandlers.ofString());
            logoutEntered.awaitReached();
            logoutEntered.resume();
            if (writing.hasUserLock()) {
                awaitUserLockWait();
            }
        } finally {
            logoutEntered.resume();
            writing.resume();
        }
        assertStatus(put.get(WAIT.toSeconds(), TimeUnit.SECONDS), 204);
        assertStatus(logout.get(WAIT.toSeconds(), TimeUnit.SECONDS), 204);
        assertThat(deviceToken(memberA)).isNull();
        assertThat(users.findDeviceTokensByIds(List.of(memberA.getId()))).isEmpty();
        assertThat(writing.statements).anyMatch(RequestProbes::isUserLock);
    }

    @Test
    @DisplayName("선행 DELETE 없이 로그아웃해도 디바이스 토큰과 Refresh Token을 폐기한다")
    void logoutAloneClearsBothTokens() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");

        assertStatus(send("POST", LOGOUT, session.access(), null), 204);

        assertThat(refreshCount(memberA)).isZero();
        assertThat(deviceToken(memberA)).isNull();
        assertThat(jdbc.queryForObject("SELECT session_version FROM users WHERE id = ?",
                Long.class, memberA.getId())).isEqualTo(version(session.access()) + 1);
    }

    @Test
    @DisplayName("Access Token이 만료되어도 현재 Refresh Token으로 서버 세션을 폐기한다")
    void expiredAccessCanLogoutWithCurrentRefreshToken() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        long version = version(session.access());
        String expiredAccess = signedToken(memberA, "access", version, Instant.now().minusSeconds(60));

        assertStatus(send("POST", LOGOUT, expiredAccess, null), 401);
        assertThat(sessionVersion(memberA)).isEqualTo(version);
        assertThat(deviceToken(memberA)).isEqualTo("registered-a");
        assertThat(storedRefreshHash(memberA)).isEqualTo(tokenHasher.hash(session.refresh()));

        var response = send("POST", REFRESH_LOGOUT, session.refresh(), null);
        assertThat(response.statusCode()).withFailMessage(
                "Refresh 로그아웃 HTTP %s, DB 버전 %s, FCM 등록 %s, Refresh Token 행 %s",
                response.statusCode(), sessionVersion(memberA), deviceToken(memberA), refreshCount(memberA))
                .isEqualTo(204);
        assertThat(sessionVersion(memberA)).isEqualTo(version + 1);
        assertThat(deviceToken(memberA)).isNull();
        assertThat(refreshCount(memberA)).isZero();
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", session.refresh())), 401);
    }

    @Test
    @DisplayName("잘못된 서명·타입·만료·해시의 Refresh 폐기 요청은 현재 세션을 바꾸지 않는다")
    void refreshLogoutRejectsInvalidCredentials() throws Exception {
        var session = login(memberA);
        long version = version(session.access());
        put(session, "registered-a");
        String unregistered = signedToken(memberA, "refresh", version);
        String expired = signedToken(memberA, "refresh", version, Instant.now().minusSeconds(60));
        refreshTokens.save(RefreshToken.create(memberA.getId(), tokenHasher.hash(expired), 60_000));
        String forged = Jwts.builder().subject(memberA.getId().toString())
                .claim("type", "refresh").claim("sv", version)
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(new byte[32])).compact();
        refreshTokens.save(RefreshToken.create(memberA.getId(), tokenHasher.hash(forged), 60_000));

        assertInvalidRefreshLogout(null);
        for (String token : List.of("synthetic-invalid-jwt", session.access(), unregistered, expired, forged)) {
            assertInvalidRefreshLogout(token);
        }
        assertThat(sessionVersion(memberA)).isEqualTo(version);
        assertThat(deviceToken(memberA)).isEqualTo("registered-a");
        assertThat(refreshCount(memberA)).isEqualTo(3);
    }

    @Test
    @DisplayName("폐기된 Refresh Token은 다시 세션을 바꾸지 못한다")
    void revokedRefreshCannotLogoutAgain() throws Exception {
        var session = login(memberA);
        assertStatus(send("POST", REFRESH_LOGOUT, session.refresh(), null), 204);

        assertInvalidRefreshLogout(session.refresh());
        assertThat(sessionVersion(memberA)).isEqualTo(version(session.access()) + 1);
        assertThat(refreshCount(memberA)).isZero();
    }

    @Test
    @DisplayName("재로그인 뒤 이전 Refresh Token으로 새 세션을 폐기할 수 없다")
    void oldRefreshCannotLogoutNewLogin() throws Exception {
        var previous = login(memberA);
        var current = login(memberA);
        put(current, "current-device");

        assertInvalidRefreshLogout(previous.refresh());
        assertThat(sessionVersion(memberA)).isEqualTo(version(current.access()));
        assertThat(deviceToken(memberA)).isEqualTo("current-device");
        assertThat(storedRefreshHash(memberA)).isEqualTo(tokenHasher.hash(current.refresh()));
    }

    @Test
    @DisplayName("Refresh 폐기가 먼저 잠그면 대기하던 재발급은 거부된다")
    void refreshLogoutWinsLockBeforeReissue() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        var writing = probes.pauseAt(sql -> sql.startsWith("delete from refresh_tokens "), null);
        var logout = http.sendAsync(request("POST", REFRESH_LOGOUT, session.refresh(), null, writing),
                HttpResponse.BodyHandlers.ofString());
        CompletableFuture<HttpResponse<String>> reissue;
        try {
            writing.awaitReached();
            reissue = http.sendAsync(request("POST", REISSUE, null, Map.of("refreshToken", session.refresh()), null),
                    HttpResponse.BodyHandlers.ofString());
            awaitUserLockWait();
        } finally {
            writing.resume();
        }

        assertStatus(logout.get(WAIT.toSeconds(), TimeUnit.SECONDS), 204);
        assertStatus(reissue.get(WAIT.toSeconds(), TimeUnit.SECONDS), 401);
        assertThat(sessionVersion(memberA)).isEqualTo(version(session.access()) + 1);
        assertThat(deviceToken(memberA)).isNull();
        assertThat(refreshCount(memberA)).isZero();
    }

    @Test
    @DisplayName("재발급이 먼저 잠그면 이전 Refresh 폐기는 거부되고 교체 토큰으로 폐기할 수 있다")
    void reissueWinsLockBeforeRefreshLogout() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        var writing = probes.pauseAt(sql -> sql.startsWith("insert into refresh_tokens "), null);
        var reissue = http.sendAsync(request("POST", REISSUE, null, Map.of("refreshToken", session.refresh()), writing),
                HttpResponse.BodyHandlers.ofString());
        CompletableFuture<HttpResponse<String>> logout;
        try {
            writing.awaitReached();
            logout = http.sendAsync(request("POST", REFRESH_LOGOUT, session.refresh(), null, null),
                    HttpResponse.BodyHandlers.ofString());
            awaitUserLockWait();
        } finally {
            writing.resume();
        }

        var rotated = tokens(reissue.get(WAIT.toSeconds(), TimeUnit.SECONDS));
        assertStatus(logout.get(WAIT.toSeconds(), TimeUnit.SECONDS), 401);
        assertThat(sessionVersion(memberA)).isEqualTo(version(session.access()));
        assertThat(deviceToken(memberA)).isEqualTo("registered-a");
        assertThat(storedRefreshHash(memberA)).isEqualTo(tokenHasher.hash(rotated.refresh()));
        assertStatus(send("POST", REFRESH_LOGOUT, rotated.refresh(), null), 204);
        assertThat(deviceToken(memberA)).isNull();
        assertThat(refreshCount(memberA)).isZero();
    }

    @Test
    @DisplayName("Refresh Token 삭제가 실패하면 버전과 FCM 토큰도 롤백한다")
    void refreshLogoutRollsBackOnDatabaseError() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        jdbc.execute("""
                CREATE FUNCTION reject_test_refresh_deletion() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF OLD.user_id = %d THEN
                        RAISE EXCEPTION 'synthetic logout failure';
                    END IF;
                    RETURN OLD;
                END;
                $$
                """.formatted(memberA.getId()));
        try {
            jdbc.execute("""
                    CREATE TRIGGER reject_test_refresh_deletion BEFORE DELETE ON refresh_tokens
                    FOR EACH ROW EXECUTE FUNCTION reject_test_refresh_deletion()
                    """);
            var failure = send("POST", REFRESH_LOGOUT, session.refresh(), null);
            assertStatus(failure, 500);
            assertThat(failure.body()).doesNotContain(session.refresh());
            assertThat(sessionVersion(memberA)).isEqualTo(version(session.access()));
            assertThat(deviceToken(memberA)).isEqualTo("registered-a");
            assertThat(storedRefreshHash(memberA)).isEqualTo(tokenHasher.hash(session.refresh()));
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS reject_test_refresh_deletion ON refresh_tokens");
            jdbc.execute("DROP FUNCTION reject_test_refresh_deletion()");
        }
        assertStatus(send("POST", REFRESH_LOGOUT, session.refresh(), null), 204);
    }

    @Test
    @DisplayName("폐기 커밋 이후 HTTP 연결을 끊어도 이전 세션은 복구되지 않는다")
    void refreshLogoutCommitSurvivesLostResponse() throws Exception {
        var session = login(memberA);
        put(session, "registered-a");
        var delayed = probes.pauseAt(RESPONSE_READY::equals, null);
        var logout = http.sendAsync(request("POST", REFRESH_LOGOUT, session.refresh(), null, delayed),
                HttpResponse.BodyHandlers.ofString());
        try {
            delayed.awaitReached();
            assertThat(sessionVersion(memberA)).isEqualTo(version(session.access()) + 1);
            assertThat(deviceToken(memberA)).isNull();
            assertThat(refreshCount(memberA)).isZero();
            assertThat(logout.cancel(true)).isTrue();
        } finally {
            delayed.resume();
        }

        assertInvalidRefreshLogout(session.refresh());
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", session.refresh())), 401);
    }

    @Test
    @DisplayName("같은 계정 재로그인 후 이전 세션의 PUT, DELETE, 로그아웃을 모두 거부한다")
    void oldSessionCannotChangeNewLogin() throws Exception {
        var oldSession = login(memberA);
        put(oldSession, "old-device");
        var current = login(memberA);
        String tokenAfterLogin = deviceToken(memberA);
        put(current, "current-device");

        assertThat(List.of(
                send("PUT", DEVICE_TOKEN, oldSession.access(), Map.of("deviceToken", "stale-device")).statusCode(),
                send("DELETE", DEVICE_TOKEN, oldSession.access(), null).statusCode(),
                send("POST", LOGOUT, oldSession.access(), null).statusCode()))
                .containsExactly(401, 401, 401);
        assertThat(tokenAfterLogin).isNull();
        assertThat(version(current.access())).isEqualTo(version(oldSession.access()) + 1);
        assertThat(deviceToken(memberA)).isEqualTo("current-device");
        assertThat(storedRefreshHash(memberA)).isEqualTo(tokenHasher.hash(current.refresh()));
    }

    @Test
    @DisplayName("재발급은 양쪽 JWT의 세션 버전을 유지하고 로그아웃은 교체 토큰도 폐기한다")
    void reissuePreservesVersion() throws Exception {
        var session = login(memberA);
        put(session, "same-device");
        var rotated = tokens(send("POST", REISSUE, null, Map.of("refreshToken", session.refresh())));

        long version = version(session.access());
        assertThat(version).isPositive();
        assertThat(version(session.refresh())).isEqualTo(version);
        assertThat(version(rotated.access())).isEqualTo(version);
        assertThat(version(rotated.refresh())).isEqualTo(version);
        assertThat(deviceToken(memberA)).isEqualTo("same-device");
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", session.refresh())), 401);
        assertStatus(send("POST", LOGOUT, session.access(), null), 204);
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", rotated.refresh())), 401);
        assertThat(refreshCount(memberA)).isZero();
    }

    @Test
    @DisplayName("로그아웃이 먼저 커밋되면 대기하던 재발급이 Refresh Token을 만들지 못한다")
    void logoutWinsAgainstReissue() throws Exception {
        var session = login(memberA);
        var delayed = probes.pauseAt(CONTROLLER::equals, memberA.getId());
        var reissue = http.sendAsync(request("POST", REISSUE, null,
                Map.of("refreshToken", session.refresh()), delayed), HttpResponse.BodyHandlers.ofString());

        try {
            delayed.awaitReached();
            assertStatus(send("POST", LOGOUT, session.access(), null), 204);
        } finally {
            delayed.resume();
        }
        assertStatus(reissue.get(WAIT.toSeconds(), TimeUnit.SECONDS), 401);
        assertThat(refreshCount(memberA)).isZero();
    }

    @Test
    @DisplayName("재발급이 먼저 잠그면 로그아웃이 기다렸다가 새 Refresh Token까지 폐기한다")
    void reissueWinsLockBeforeLogout() throws Exception {
        var session = login(memberA);
        var writing = probes.pauseAt(sql -> sql.startsWith("insert into refresh_tokens "), null);
        var reissue = http.sendAsync(request("POST", REISSUE, null,
                Map.of("refreshToken", session.refresh()), writing), HttpResponse.BodyHandlers.ofString());
        var logoutEntered = probes.pauseAt(CONTROLLER::equals, null);
        CompletableFuture<HttpResponse<String>> logout;

        try {
            writing.awaitReached();
            logout = http.sendAsync(request("POST", LOGOUT, session.access(), null, logoutEntered),
                    HttpResponse.BodyHandlers.ofString());
            logoutEntered.awaitReached();
            logoutEntered.resume();
            if (writing.hasUserLock()) {
                awaitUserLockWait();
            }
        } finally {
            logoutEntered.resume();
            writing.resume();
        }
        var rotated = tokens(reissue.get(WAIT.toSeconds(), TimeUnit.SECONDS));
        assertStatus(logout.get(WAIT.toSeconds(), TimeUnit.SECONDS), 204);
        assertThat(refreshCount(memberA)).isZero();
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", rotated.refresh())), 401);
        assertThat(writing.statements).anyMatch(RequestProbes::isUserLock);
    }

    @Test
    @DisplayName("서명은 유효해도 세션 버전이 누락되거나 잘못된 JWT는 거부한다")
    void rejectsLegacyAndInvalidVersion() throws Exception {
        var session = login(memberA);
        put(session, "current-device");

        String legacyAccess = signedToken(memberA, "access", null);
        String staleAccess = signedToken(memberA, "access", 99L);
        String malformedAccess = signedToken(memberA, "access", "1");
        assertThat(List.of(
                send("DELETE", DEVICE_TOKEN, legacyAccess, null).statusCode(),
                send("DELETE", DEVICE_TOKEN, staleAccess, null).statusCode(),
                send("DELETE", DEVICE_TOKEN, malformedAccess, null).statusCode()))
                .containsExactly(401, 401, 401);
        assertThat(deviceToken(memberA)).isEqualTo("current-device");

        String legacyRefresh = signedToken(memberA, "refresh", null);
        refreshTokens.save(RefreshToken.create(memberA.getId(), tokenHasher.hash(legacyRefresh), 60_000));
        assertStatus(send("POST", REISSUE, null, Map.of("refreshToken", legacyRefresh)), 401);
        assertStatus(send("DELETE", DEVICE_TOKEN, session.access(), null), 204);
        put(session, "re-registered-device");
        var relogged = login(memberA);
        assertThat(version(relogged.access())).isEqualTo(version(session.access()) + 1);
        put(relogged, "post-relogin-device");
    }

    private void awaitUserLockWait() {
        assertThat(jdbc.queryForObject("SHOW transaction_isolation", String.class)).isEqualTo("read committed");
        await().atMost(WAIT).until(() -> Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_stat_activity
                    WHERE datname = current_database()
                      AND wait_event_type = 'Lock'
                      AND query LIKE 'select%from users%for %update%'
                )
                """, Boolean.class)));
    }

    private User saveUser() {
        return users.save(User.create(UUID.randomUUID() + "@catholic.ac.kr",
                passwordEncoder.encode(PASSWORD), "컴퓨터정보공학부", null, 2, "재학"));
    }

    private Tokens login(User member) throws Exception {
        return tokens(send("POST", "/api/auth/login", null,
                Map.of("email", member.getEmail(), "password", PASSWORD)));
    }

    private Tokens tokens(HttpResponse<String> response) {
        assertStatus(response, 200);
        JsonNode payload = json.readTree(response.body());
        return new Tokens(payload.get("accessToken").asText(), payload.get("refreshToken").asText());
    }

    private void put(Tokens session, String deviceToken) throws Exception {
        assertStatus(send("PUT", DEVICE_TOKEN, session.access(), Map.of("deviceToken", deviceToken)), 204);
    }

    private HttpResponse<String> send(String method, String path, String access, Map<String, ?> body)
            throws Exception {
        return http.send(request(method, path, access, body, null), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest request(String method, String path, String access, Map<String, ?> body, Probe probe) {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(WAIT.multipliedBy(3))
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (access != null) builder.header("Authorization", "Bearer " + access);
        if (body != null) builder.header("Content-Type", "application/json");
        if (probe != null) builder.header(PROBE_HEADER, probe.id);
        return builder.build();
    }

    private static void assertStatus(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).as("%s %s", response.request().method(), response.uri().getPath())
                .isEqualTo(status);
    }

    private void assertInvalidRefreshLogout(String token) throws Exception {
        var response = send("POST", REFRESH_LOGOUT, token, null);
        assertStatus(response, 401);
        assertThat(json.readTree(response.body()).get("code").asText()).isEqualTo("REFRESH_TOKEN_INVALID");
        if (token != null) assertThat(response.body()).doesNotContain(token);
    }

    private long version(String token) {
        Number version = (Number) Jwts.parser().verifyWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret)))
                .build().parseSignedClaims(token).getPayload().get("sv");
        assertThat(version).as("JWT 세션 버전").isNotNull();
        return version.longValue();
    }

    private String signedToken(User user, String type, Object version) {
        return signedToken(user, type, version, Instant.now().plusSeconds(60));
    }

    private String signedToken(User user, String type, Object version, Instant expiresAt) {
        var token = Jwts.builder().id(UUID.randomUUID().toString()).subject(user.getId().toString())
                .claim("type", type).expiration(Date.from(expiresAt));
        if (version != null) token.claim("sv", version);
        return token.signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret))).compact();
    }

    private String deviceToken(User member) {
        return jdbc.queryForObject("SELECT device_token FROM users WHERE id = ?", String.class, member.getId());
    }

    private long sessionVersion(User member) {
        return jdbc.queryForObject("SELECT session_version FROM users WHERE id = ?", Long.class, member.getId());
    }

    private int refreshCount(User member) {
        return jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE user_id = ?",
                Integer.class, member.getId());
    }

    private String storedRefreshHash(User member) {
        return jdbc.queryForObject("SELECT token FROM refresh_tokens WHERE user_id = ?", String.class, member.getId());
    }

    private record Tokens(String access, String refresh) {}

    static final class Probe {
        private final String id = UUID.randomUUID().toString();
        private final Predicate<String> pauseAt;
        private final Long preloadUser;
        private final CountDownLatch reached = new CountDownLatch(1);
        private final CountDownLatch resume = new CountDownLatch(1);
        private final ConcurrentLinkedQueue<String> statements = new ConcurrentLinkedQueue<>();

        Probe(Predicate<String> pauseAt, Long preloadUser) {
            this.pauseAt = pauseAt;
            this.preloadUser = preloadUser;
        }

        void visit(String event) {
            statements.add(event);
            if (!pauseAt.test(event)) return;
            reached.countDown();
            waitFor(resume, "요청 재개", WAIT.multipliedBy(2));
        }

        void awaitReached() {
            waitFor(reached, "요청 중단 지점 도착", WAIT);
        }

        void resume() {
            resume.countDown();
        }

        boolean hasUserLock() {
            return statements.stream().anyMatch(RequestProbes::isUserLock);
        }

        private static void waitFor(CountDownLatch latch, String description, Duration timeout) {
            try {
                if (!latch.await(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                    throw new AssertionError(description + " 대기 시간 초과");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError(description + " 대기 중 인터럽트", e);
            }
        }
    }

    static final class RequestProbes implements HandlerInterceptor, StatementInspector {
        private final ObjectProvider<UserJpaRepository> users;
        private final Map<String, Probe> active = new ConcurrentHashMap<>();

        RequestProbes(ObjectProvider<UserJpaRepository> users) {
            this.users = users;
        }

        Probe pauseAt(Predicate<String> pauseAt, Long preloadUser) {
            var probe = new Probe(pauseAt, preloadUser);
            active.put(probe.id, probe);
            return probe;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            Probe probe = find(request);
            if (probe == null) return true;
            // 쓰기 전에 세션이 바뀌어도 이미 관리 중인 엔티티를 그대로 쓰지 않는지 검증한다.
            if (probe.preloadUser != null) users.getObject().findById(probe.preloadUser).orElseThrow();
            probe.visit(CONTROLLER);
            return true;
        }

        @Override
        public void postHandle(HttpServletRequest request, HttpServletResponse response,
                               Object handler, ModelAndView modelAndView) {
            Probe probe = find(request);
            if (probe != null) probe.visit(RESPONSE_READY);
        }

        @Override
        public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                    Object handler, Exception ex) {
            String id = request.getHeader(PROBE_HEADER);
            if (id != null) active.remove(id);
        }

        @Override
        public String inspect(String sql) {
            if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
                Probe probe = find(attributes.getRequest());
                if (probe != null) probe.visit(sql);
            }
            return sql;
        }

        private Probe find(HttpServletRequest request) {
            String id = request.getHeader(PROBE_HEADER);
            return id == null ? null : active.get(id);
        }

        private static boolean isUserLock(String sql) {
            return sql.contains(" from users ")
                    && (sql.contains(" for update") || sql.contains(" for no key update"));
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ProbeConfig {
        @Bean
        RequestProbes requestProbes(ObjectProvider<UserJpaRepository> users) {
            return new RequestProbes(users);
        }

        @Bean
        HibernatePropertiesCustomizer probeSql(RequestProbes probes) {
            return properties -> properties.put("hibernate.session_factory.statement_inspector", probes);
        }

        @Bean
        WebMvcConfigurer probeHttp(RequestProbes probes) {
            return new WebMvcConfigurer() {
                @Override
                public void addInterceptors(InterceptorRegistry registry) {
                    registry.addInterceptor(probes);
                }
            };
        }
    }
}
