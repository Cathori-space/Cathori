package org.cathori.backend.user.application.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.util.List;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("EmailDomainPolicy — 신규 가입 학교 도메인 제한 (ADR D1 · §7)")
class EmailDomainPolicyTest {

    // given (공통) — 허용 도메인 catholic.ac.kr, 예외 주소 1개
    private final EmailDomainPolicy policy =
            new EmailDomainPolicy(List.of("catholic.ac.kr"), List.of("reviewer@cathori.test"));

    @ParameterizedTest
    @ValueSource(strings = {"a@catholic.ac.kr", "Hong@catholic.ac.kr", "reviewer@cathori.test"})
    @DisplayName("통과 — 학교 도메인(아이디 대소문자 무관), 예외 목록 주소")
    void allowed(String email) {
        // when
        boolean allowed = policy.isAllowed(email);

        // then
        assertThat(allowed).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "a@gmail.com",
            "a@x.catholic.ac.kr",              // 서브도메인
            "a@catholic.ac.kr.evil.com",       // 유사 도메인
            "hong@Catholic.ac.kr",             // 도메인 대문자
            "a@gmail.com@catholic.ac.kr",      // @ 여러 개
            "@catholic.ac.kr",                 // 아이디 비어 있음
            " a@catholic.ac.kr",               // 앞 공백
            "a b@catholic.ac.kr",              // 아이디 중간 공백
            "a@catholic.ac.kr ",               // 뒤 공백
            "a@",
            "no-at-sign"
    })
    @DisplayName("거부 — 타 도메인 · 서브도메인 · 유사 도메인 · 도메인 대소문자 · 다중 @ · 공백 · 형식 이상")
    void rejected(String email) {
        // when
        boolean allowed = policy.isAllowed(email);

        // then
        assertThat(allowed).isFalse();
    }

    @Test
    @DisplayName("null은 거부")
    void nullRejected() {
        // when
        boolean allowed = policy.isAllowed(null);

        // then
        assertThat(allowed).isFalse();
    }

    @Test
    @DisplayName("requireAllowed — SIGNUP만 검사, PASSWORD_RESET은 통과")
    void requireAllowedOnlyForSignup() {
        // given
        String gmail = "a@gmail.com";

        // when
        BusinessException signup = catchThrowableOfType(BusinessException.class,
                () -> policy.requireAllowed(VerificationPurpose.SIGNUP, gmail));
        Throwable passwordReset = catchThrowable(
                () -> policy.requireAllowed(VerificationPurpose.PASSWORD_RESET, gmail));

        // then
        assertThat(signup.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        assertThat(passwordReset).isNull();
    }
}
