package org.cathori.backend.user.application.email;

import java.util.Optional;

/**
 * 발급된 인증번호 저장소 포트. 키는 {@code (purpose, email)}.
 *
 * <p>어댑터는 TTL이 지난 항목을 스스로 비워야 한다 — 구현체가 만료를 책임지므로
 * {@link #find}가 돌려준 값은 "아직 살아 있는 값"이다.
 */
public interface VerificationCodeStore {

    void save(VerificationPurpose purpose, String email, VerificationCode code);

    Optional<VerificationCode> find(VerificationPurpose purpose, String email);

    void remove(VerificationPurpose purpose, String email);
}
