package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.VerificationCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.infra.email.CaffeineVerificationCodeStore;
import org.cathori.backend.user.infra.email.CaffeineVerifiedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.cathori.backend.user.application.email.VerificationPurpose.PASSWORD_RESET;
import static org.cathori.backend.user.application.email.VerificationPurpose.SIGNUP;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("EmailVerificationService 목적(purpose) 분리 · 가입 도메인 제한")
class EmailVerificationServiceTest {

    private static final String EMAIL = "student@catholic.ac.kr";
    private static final String GMAIL = "someone@gmail.com";
    private static final EmailDomainPolicy SCHOOL_ONLY =
            new EmailDomainPolicy(List.of("catholic.ac.kr"), List.of());

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
        service = new EmailVerificationService(codeStore, verifiedStore, notificationPort, SCHOOL_ONLY, ttl);
    }

    /** 발송된 메일에 실린 인증번호를 꺼낸다. */
    private String sentCode(VerificationPurpose purpose, String email) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(notificationPort).sendVerificationCode(eq(purpose), eq(email), code.capture());
        return code.getValue();
    }

    @Test
    @DisplayName("SIGNUP으로 받은 번호로는 PASSWORD_RESET 인증이 되지 않는다")
    void signupCodeCannotVerifyPasswordReset() {
        // given
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(PASSWORD_RESET, EMAIL, code));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("PASSWORD_RESET 인증은 SIGNUP 인증 상태를 만들지 않는다")
    void passwordResetVerificationDoesNotMarkSignup() {
        // given
        service.sendCode(PASSWORD_RESET, EMAIL);
        String code = sentCode(PASSWORD_RESET, EMAIL);

        // when
        service.verifyCode(PASSWORD_RESET, EMAIL, code);

        // then
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isTrue();
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("틀린 번호는 실패를 누적하되 만료 시각을 바꾸지 않고, 맞는 번호는 여전히 통과한다")
    void wrongCodeAccumulatesFailureWithoutExtendingExpiry() {
        // given
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);
        VerificationCode before = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        String wrong = code.equals("000000") ? "111111" : "000000";

        // when — 한 번 틀린다
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, EMAIL, wrong));

        // then — 실패만 누적, 만료 시각 유지
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_INVALID_VERIFY_CODE);
        VerificationCode after = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        assertThat(after.failedAttempts()).isEqualTo(1);
        assertThat(after.expiresAt()).isEqualTo(before.expiresAt());

        // when — 이어서 맞는 번호를 넣는다
        service.verifyCode(SIGNUP, EMAIL, code);

        // then — 인증 완료, 쓴 번호는 재사용 불가
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isTrue();
        assertThat(codeStore.find(SIGNUP, EMAIL)).isEmpty();
    }

    @Test
    @DisplayName("SIGNUP 발송 — 비학교 도메인이면 메일을 보내지 않고 거부한다")
    void signupSendRejectsNonSchoolDomain() {
        // given — 비학교 도메인 주소 (GMAIL)

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.sendCode(SIGNUP, GMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        verify(notificationPort, never()).sendVerificationCode(any(), anyString(), anyString());
        assertThat(codeStore.find(SIGNUP, GMAIL)).isEmpty();
    }

    @Test
    @DisplayName("SIGNUP 확인 — 비학교 도메인이면 거부한다")
    void signupVerifyRejectsNonSchoolDomain() {
        // given — 비학교 도메인 주소 (GMAIL)

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, GMAIL, "000000"));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        assertThat(verifiedStore.isVerified(SIGNUP, GMAIL)).isFalse();
    }

    @Test
    @DisplayName("PASSWORD_RESET — 비학교 도메인도 발송·인증된다 (기존 회원 복구 경로, ADR D1)")
    void passwordResetIgnoresDomainPolicy() {
        // given
        service.sendCode(PASSWORD_RESET, GMAIL);
        String code = sentCode(PASSWORD_RESET, GMAIL);

        // when
        service.verifyCode(PASSWORD_RESET, GMAIL, code);

        // then
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, GMAIL)).isTrue();
    }
}
