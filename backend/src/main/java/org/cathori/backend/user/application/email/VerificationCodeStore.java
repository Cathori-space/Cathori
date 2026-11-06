package org.cathori.backend.user.application.email;

import java.util.Optional;
import java.util.function.UnaryOperator;

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

    /**
     * 값이 있을 때만 {@code remapping}으로 바꾼다 — 같은 키에 대해 원자적이어야 한다.
     * {@code null}을 돌려주면 지우고, 값이 없으면(만료 포함) 호출하지 않는다.
     */
    void computeIfPresent(VerificationPurpose purpose, String email, UnaryOperator<VerificationCode> remapping);
}
