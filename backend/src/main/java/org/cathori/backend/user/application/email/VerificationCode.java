package org.cathori.backend.user.application.email;

import java.time.Duration;
import java.time.Instant;

/**
 * 발급된 인증번호 한 건.
 *
 * @param code           6자리 숫자 문자열
 * @param expiresAt      만료 시각. 저장소 TTL은 쓸 때마다 리셋되므로 만료 판단은 이 값으로 한다.
 * @param failedAttempts 틀린 입력 횟수. 5회 제한(ADR D3)에서 사용한다.
 */
public record VerificationCode(String code, Instant expiresAt, int failedAttempts) {

    /** 번호 하나당 틀릴 수 있는 횟수 (ADR D3). */
    public static final int MAX_FAILED_ATTEMPTS = 5;

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
