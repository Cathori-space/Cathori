package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.infra.email.CaffeineVerifiedEmailStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("AuthService.register 인증 목적 고정")
class AuthServiceRegisterPurposeTest {

    @Test
    @DisplayName("PASSWORD_RESET으로 인증한 이메일로는 가입할 수 없다 — 학교 도메인 제한 우회 방지")
    void passwordResetVerificationCannotRegister() {
        String email = "someone@catholic.ac.kr";
        VerifiedEmailStore verifiedStore = new CaffeineVerifiedEmailStore(Duration.ofMinutes(30));
        verifiedStore.markVerified(VerificationPurpose.PASSWORD_RESET, email);
        UserService userService = mock(UserService.class);
        AuthService authService = new AuthService(verifiedStore, userService, null, null, null, null, null);

        RegisterRequest request = new RegisterRequest(email, "password123!", "컴퓨터정보공학부", null, 2, "재학");

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(UserErrorCode.USER_NOT_VERIFIED);
        verify(userService, never()).save(any());
    }
}
