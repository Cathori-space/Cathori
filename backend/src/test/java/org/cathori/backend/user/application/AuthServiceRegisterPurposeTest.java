package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.infra.email.CaffeineVerifiedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("AuthService.register — 가입 목적 고정 · 가입 도메인 제한")
class AuthServiceRegisterPurposeTest {

    private static final EmailDomainPolicy SCHOOL_ONLY =
            new EmailDomainPolicy(List.of("catholic.ac.kr"), List.of());

    private VerifiedEmailStore verifiedStore;
    private UserService userService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        verifiedStore = new CaffeineVerifiedEmailStore(Duration.ofMinutes(30));
        userService = mock(UserService.class);
        authService = new AuthService(verifiedStore, userService, null, null, null, null, null, SCHOOL_ONLY);
    }

    private static RegisterRequest registerRequest(String email) {
        return new RegisterRequest(email, "password123!", "컴퓨터정보공학부", null, 2, "재학");
    }

    @Test
    @DisplayName("PASSWORD_RESET으로 인증한 이메일로는 가입할 수 없다")
    void passwordResetVerificationCannotRegister() {
        // given — 비밀번호 재설정 목적으로만 인증된 학교 이메일
        String email = "someone@catholic.ac.kr";
        verifiedStore.markVerified(VerificationPurpose.PASSWORD_RESET, email);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> authService.register(registerRequest(email)));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_NOT_VERIFIED);
        verify(userService, never()).save(any());
    }

    @Test
    @DisplayName("비학교 도메인은 SIGNUP 인증 상태가 있어도 가입할 수 없다")
    void nonSchoolDomainCannotRegisterEvenIfVerified() {
        // given — 정책 적용 전에 만들어진 SIGNUP 인증 상태를 가정
        String email = "someone@gmail.com";
        verifiedStore.markVerified(VerificationPurpose.SIGNUP, email);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> authService.register(registerRequest(email)));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        verify(userService, never()).save(any());
    }

    @Test
    @DisplayName("인증 완료 상태가 만료된 뒤에는 가입할 수 없다 (운영 30분, ADR §7)")
    void expiredVerificationCannotRegister() throws InterruptedException {
        // given — 유효시간 100ms인 저장소에서 인증을 마치고 만료될 때까지 기다린다
        VerifiedEmailStore shortLived = new CaffeineVerifiedEmailStore(Duration.ofMillis(100));
        AuthService service = new AuthService(shortLived, userService, null, null, null, null, null, SCHOOL_ONLY);
        String email = "someone@catholic.ac.kr";
        shortLived.markVerified(VerificationPurpose.SIGNUP, email);
        Thread.sleep(200);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.register(registerRequest(email)));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_NOT_VERIFIED);
        verify(userService, never()).save(any());
    }
}
