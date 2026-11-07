package org.cathori.backend.user.application.email;

/**
 * 인증을 완료한 이메일 저장소 포트. 키는 {@code (purpose, email)}.
 *
 * <p>목적을 키에 포함하는 이유: {@code PASSWORD_RESET}으로 인증한 상태로
 * 회원가입이 통과되면 학교 도메인 제한이 무력화된다.
 *
 * <p>어댑터는 TTL(기본 30분)을 적용해야 한다. 만료가 없으면 인증만 하고 떠난 이메일이
 * 서버 재시작 전까지 영구히 가입 가능한 상태로 남는다 (PRD F-04).
 */
public interface VerifiedEmailStore {

    void markVerified(VerificationPurpose purpose, String email);

    boolean isVerified(VerificationPurpose purpose, String email);

    void remove(VerificationPurpose purpose, String email);
}
