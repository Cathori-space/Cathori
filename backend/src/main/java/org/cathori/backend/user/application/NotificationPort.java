package org.cathori.backend.user.application;

import org.cathori.backend.user.application.email.VerificationPurpose;

public interface NotificationPort {

    /**
     * 인증번호를 메일로 보낸다.
     *
     * <p>{@code purpose}를 받는 이유: 회원가입과 비밀번호 재설정의 메일 제목·본문이 달라야 한다.
     * 제목이 "이메일 인증번호"로 같으면, 비밀번호 재설정 요청을 받은 사용자가 가입 메일로 착각한다.
     */
    void sendVerificationCode(VerificationPurpose purpose, String email, String code);
}
