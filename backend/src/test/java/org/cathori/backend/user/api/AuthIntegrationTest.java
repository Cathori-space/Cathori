package org.cathori.backend.user.api;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.user.application.AuthService;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.application.VerificationStore;
import org.cathori.backend.user.application.VerifiedEmailStore;
import org.cathori.backend.user.api.dto.LoginRequest;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;


import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Auth 통합 테스트")
class AuthIntegrationTest extends IntegrationTestBase {

    @Autowired MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;
    @Autowired AuthService authService;
    @Autowired VerifiedEmailStore verifiedEmailStore;
    @Autowired VerificationStore verificationStore;
    @Autowired UserJpaRepository userJpaRepository;
    @MockitoBean
    NotificationPort notificationPort;

    private static final String EMAIL    = "test@catholic.ac.kr";
    private static final String PASSWORD = "password123!";
    private static final String MAJOR    = "컴퓨터정보공학부";
    private static final int    GRADE    = 2;
    private static final String STATUS   = "재학";

    @AfterEach
    void cleanup() {
        userJpaRepository.findByEmail(EMAIL).ifPresent(userJpaRepository::delete);
        verifiedEmailStore.remove(EMAIL);
        verificationStore.remove(EMAIL);
    }

    private void createVerifiedUser(String email, String password) {
        verifiedEmailStore.markVerified(email);
        authService.register(new RegisterRequest(email, password, MAJOR, null, GRADE, STATUS));
    }

    @Test
    @DisplayName("A-1: 이메일 인증 완료 후 회원가입 성공 시 201과 userId/email 반환")
    void register_success() throws Exception {
        verifiedEmailStore.markVerified(EMAIL);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(EMAIL, PASSWORD, MAJOR, null, GRADE, STATUS))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.userId").isNumber());

    }

    @Test
    @DisplayName("A-2: 이메일 인증 없이 회원가입 시 403 USER_NOT_VERIFIED 반환")
    void register_emailNotVerified() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(EMAIL, PASSWORD, MAJOR, null, GRADE, STATUS))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("USER_NOT_VERIFIED"));
    }

    @Test
    @DisplayName("A-3: 이미 가입된 이메일로 재가입 시 409 USER_EMAIL_DUPLICATE 반환")
    void register_duplicateEmail() throws Exception {
        createVerifiedUser(EMAIL, PASSWORD);

        verifiedEmailStore.markVerified(EMAIL);
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(EMAIL, PASSWORD, MAJOR, null, GRADE, STATUS))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USER_EMAIL_DUPLICATE"));
    }

    @Test
    @DisplayName("A-4: 올바른 이메일/비밀번호로 로그인 시 200과 JWT 토큰 반환")
    void login_success() throws Exception {
        createVerifiedUser(EMAIL, PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(EMAIL, PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isString())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.userId").isNumber());
    }

    @Test
    @DisplayName("A-5: 잘못된 비밀번호로 로그인 시 401 USER_INVALID_PASSWORD 반환")
    void login_wrongPassword() throws Exception {
        createVerifiedUser(EMAIL, PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(EMAIL, "wrongPassword!"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("USER_INVALID_PASSWORD"));
    }

    @Test
    @DisplayName("A-6: 존재하지 않는 이메일로 로그인 시 404 USER_NOT_FOUND 반환")
    void login_userNotFound() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("nobody@catholic.ac.kr", PASSWORD))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }
}
