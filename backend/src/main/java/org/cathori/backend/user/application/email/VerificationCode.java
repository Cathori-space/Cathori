package org.cathori.backend.user.application.email;

import java.time.Duration;
import java.time.Instant;

/**
 * 발급된 인증번호 한 건.
 *
 * @param code           6자리 숫자 문자열
 * @param expiresAt      만료 시각. 저장소의 TTL과 별개로 값 자체가 만료를 들고 있어야
 *                       재발송 시 번호 재사용(ADR D2) 판단과 앱의 남은 시간 표시가 가능하다.
 * @param failedAttempts 틀린 입력 횟수. 5회 제한(ADR D3)에서 사용한다.
 */
public record VerificationCode(String code, Instant expiresAt, int failedAttempts) {

    public static VerificationCode issue(String code, Instant now, Duration ttl) {
        return new VerificationCode(code, now.plus(ttl), 0);
    }

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }

    public boolean matches(String input) {
        return code.equals(input);
    }

    /** 실패 횟수만 1 올린 새 값. 만료 시각은 유지된다 — 틀려도 TTL이 연장되지 않는다. */
    public VerificationCode withFailure() {
        return new VerificationCode(code, expiresAt, failedAttempts + 1);
    }
}
