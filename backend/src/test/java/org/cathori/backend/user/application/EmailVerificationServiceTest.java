package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.infra.email.CaffeineVerificationCodeStore;
import org.cathori.backend.user.infra.email.CaffeineVerifiedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.cathori.backend.user.application.email.VerificationPurpose.PASSWORD_RESET;
import static org.cathori.backend.user.application.email.VerificationPurpose.SIGNUP;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("EmailVerificationService 목적(purpose) 분리")
class EmailVerificationServiceTest {

    private static final String EMAIL = "student@catholic.ac.kr";

    private VerificationCodeStore codeStore;
    private VerifiedEmailStore verifiedStore;
    private NotificationPort notificationPort;
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        Duration ttl = Duration.ofMinutes(3);
        codeStore = new CaffeineVerificationCodeStore(ttl);
        verifiedStore = new CaffeineVerifiedEmailStore(Duration.ofMinutes(30));
        notificationPort = mock(NotificationPort.class);
        service = new EmailVerificationService(codeStore, verifiedStore, notificationPort, ttl);
    }

    private String sentCode(org.cathori.backend.user.application.email.VerificationPurpose purpose) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(notificationPort).sendVerificationCode(eq(purpose), eq(EMAIL), code.capture());
        return code.getValue();
    }

    @Test
    @DisplayName("SIGNUP으로 받은 번호로는 PASSWORD_RESET 인증이 되지 않는다")
    void signupCodeCannotVerifyPasswordReset() {
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP);

        assertThatThrownBy(() -> service.verifyCode(PASSWORD_RESET, EMAIL, code))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("PASSWORD_RESET 인증은 SIGNUP 인증 상태를 만들지 않는다")
    void passwordResetVerificationDoesNotMarkSignup() {
        service.sendCode(PASSWORD_RESET, EMAIL);
        service.verifyCode(PASSWORD_RESET, EMAIL, sentCode(PASSWORD_RESET));

        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isTrue();
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("틀린 번호는 실패를 누적하되 만료 시각을 바꾸지 않고, 맞는 번호는 여전히 통과한다")
    void wrongCodeAccumulatesFailureWithoutExtendingExpiry() {
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP);
        var before = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        String wrong = code.equals("000000") ? "111111" : "000000";

        assertThatThrownBy(() -> service.verifyCode(SIGNUP, EMAIL, wrong))
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(UserErrorCode.USER_INVALID_VERIFY_CODE);

        var after = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        assertThat(after.failedAttempts()).isEqualTo(1);
        assertThat(after.expiresAt()).isEqualTo(before.expiresAt());

        service.verifyCode(SIGNUP, EMAIL, code);
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isTrue();
        assertThat(codeStore.find(SIGNUP, EMAIL)).isEmpty();   // 성공한 번호는 재사용 불가
    }
}
