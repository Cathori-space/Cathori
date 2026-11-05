package org.cathori.backend.user.application.email;

/**
 * 이메일 인증의 목적.
 *
 * <p>인증번호와 인증 완료 상태는 모두 {@code (purpose, email)}로 키를 잡는다.
 * 목적을 섞으면 회원가입용으로 받은 인증 상태로 비밀번호를 재설정할 수 있게 된다.
 */
public enum VerificationPurpose {

    /** 회원가입. 학교 도메인 제한과 중복 이메일 검사가 걸린다. */
    SIGNUP,

    /** 비밀번호 재설정(#216). 기존 비학교 도메인 회원의 복구 경로이므로 도메인 제한을 걸지 않는다. */
    PASSWORD_RESET
}
