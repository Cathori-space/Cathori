package org.cathori.backend.user.application.email;

import java.time.Duration;
import java.util.Optional;

/**
 * 메일 발송 이력 저장소 포트. 키는 이메일이고 purpose와 무관하다 — 목적을 바꿔 한도를 늘리지 못하게 (ADR D4).
 *
 * <p>한도와 윈도우는 호출 측이 넘긴다. 저장소는 언제 보냈는지만 안다.
 */
public interface SendRateLimiter {

    /** 지금 발송했음을 기록한다. */
    void record(String email);

    /** {@code window} 안에 기록된 발송 횟수. */
    int countWithin(String email, Duration window);

    /**
     * {@code window} 안의 발송이 {@code limit}에 도달했다면, 다시 보낼 수 있게 되기까지 남은 시간.
     * 한도에 걸리지 않았으면 {@link Optional#empty()}.
     */
    Optional<Duration> retryAfter(String email, Duration window, int limit);

    /** 이력을 비운다. 테스트 격리용. */
    void clear(String email);
}
