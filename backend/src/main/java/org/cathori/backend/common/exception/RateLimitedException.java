package org.cathori.backend.common.exception;

import java.time.Duration;

import lombok.Getter;

/**
 * 요청 횟수 제한에 걸렸을 때 던진다. 응답은 429 + {@code Retry-After} 헤더 + 본문 {@code retryAfterSeconds}.
 *
 * <p>남은 시간은 올림한 초로 내보낸다 — 0.3초가 남았을 때 0초라고 알려주면 클라이언트가
 * 즉시 재시도해 다시 429를 받는다. 최소 1초.
 */
@Getter
public class RateLimitedException extends BusinessException {

    private final long retryAfterSeconds;

    public RateLimitedException(ErrorCode errorCode, Duration retryAfter) {
        super(errorCode);
        this.retryAfterSeconds = toSecondsCeil(retryAfter);
    }

    static long toSecondsCeil(Duration retryAfter) {
        if (retryAfter == null || retryAfter.isNegative() || retryAfter.isZero()) {
            return 1;
        }
        long seconds = retryAfter.getSeconds();
        if (retryAfter.getNano() > 0 && seconds < Long.MAX_VALUE) {
            return seconds + 1;
        }
        return Math.max(seconds, 1);
    }
}
