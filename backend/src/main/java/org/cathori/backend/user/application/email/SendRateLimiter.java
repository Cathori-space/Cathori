package org.cathori.backend.user.application.email;

import java.time.Duration;
import java.time.Instant;

/**
 * 메일 발송 이력 저장소 포트. 키는 이메일이고 purpose와 무관하다 — 목적을 바꿔 한도를 늘리지 못하게 (ADR D4).
 *
 * <p>한도와 윈도우는 호출 측이 넘긴다. 저장소는 언제 보냈는지만 안다.
 */
public interface SendRateLimiter {

    /** 지금 발송했음을 기록하고, 기록한 시각을 돌려준다 ({@link #remove}로 되돌릴 때 쓴다). */
    Instant record(String email);

    /** {@code record}가 돌려준 기록 1건을 지운다. 발송에 실패한 요청을 횟수에서 빼는 용도다. */
    void remove(String email, Instant recordedAt);

    /** {@code window} 안에 기록된 발송 횟수. */
    int countWithin(String email, Duration window);

    /** 이력을 비운다. 테스트 격리용. */
    void clear(String email);
}
