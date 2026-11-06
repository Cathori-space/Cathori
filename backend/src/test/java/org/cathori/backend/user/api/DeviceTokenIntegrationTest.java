package org.cathori.backend.user.api;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.security.JwtUtil;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("기기 토큰 반납의 실제 DB 영속화")
class DeviceTokenIntegrationTest extends IntegrationTestBase {
    @Autowired MockMvc mockMvc;
    @Autowired UserJpaRepository users;
    @Autowired JwtUtil jwtUtil;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean NotificationPort notificationPort;

    private Long userId;
    private Long otherUserId;
    private String accessToken;

    @BeforeEach
    void setUp() {
        userId = saveUser();
        otherUserId = saveUser();
        accessToken = accessTokenFor(userId);
    }

    @AfterEach
    void cleanup() {
        users.deleteById(userId);
        users.deleteById(otherUserId);
    }

    @Test
    @DisplayName("인증된 PUT과 DELETE 후 별도 DB 조회에서도 토큰이 null이다")
    void clearDeviceToken_persistsOutsideRequest() throws Exception {
        register(userId, accessToken, "device-a");
        register(otherUserId, accessTokenFor(otherUserId), "device-b");

        mockMvc.perform(delete("/api/users/device-token")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());

        assertThat(tokenInDatabase(userId)).isNull();
        assertThat(tokenInDatabase(otherUserId)).isEqualTo("device-b");
    }

    @Test
    @DisplayName("무인증 반납은 거부되고 기존 등록을 변경하지 않는다")
    void clearDeviceToken_requiresAuthentication() throws Exception {
        register(userId, accessToken, "device-a");

        mockMvc.perform(delete("/api/users/device-token"))
                .andExpect(status().isUnauthorized());

        assertThat(tokenInDatabase(userId)).isEqualTo("device-a");
    }

    @Test
    @DisplayName("반납을 반복해도 성공하고 이후 새 토큰을 등록할 수 있다")
    void clearDeviceToken_isIdempotentAndAllowsRegistration() throws Exception {
        register(userId, accessToken, "device-a");
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(delete("/api/users/device-token")
                            .header("Authorization", "Bearer " + accessToken))
                    .andExpect(status().isNoContent());
            assertThat(tokenInDatabase(userId)).isNull();
        }
        register(userId, accessToken, "device-new");
    }

    private Long saveUser() {
        return users.save(User.create(UUID.randomUUID() + "@catholic.ac.kr", "unused-password",
                "ComputerScience", null, 2, "ENROLLED")).getId();
    }

    private String accessTokenFor(Long id) {
        User user = users.findById(id).orElseThrow();
        return jwtUtil.generateAccessToken(id, user.getSessionVersion());
    }

    private void register(Long id, String token, String deviceToken) throws Exception {
        mockMvc.perform(put("/api/users/device-token")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deviceToken\":\"" + deviceToken + "\"}"))
                .andExpect(status().isNoContent());
        assertThat(tokenInDatabase(id)).isEqualTo(deviceToken);
    }

    private String tokenInDatabase(Long id) {
        // 테스트 트랜잭션과 영속성 컨텍스트를 공유하지 않고 실제 커밋된 값을 확인한다.
        return jdbc.queryForObject("SELECT device_token FROM users WHERE id = ?", String.class, id);
    }
}
