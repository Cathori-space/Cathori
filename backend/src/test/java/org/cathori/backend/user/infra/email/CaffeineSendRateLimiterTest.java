package org.cathori.backend.user.infra.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CaffeineSendRateLimiter 이메일 단위 집계")
class CaffeineSendRateLimiterTest {

    private final CaffeineSendRateLimiter limiter = new CaffeineSendRateLimiter(Duration.ofHours(1));

    @Test
    @DisplayName("한도에 도달하면 재시도까지 남은 시간을 돌려주고, 다른 이메일에는 영향이 없다")
    void retryAfterWhenLimitReached() {
        Duration window = Duration.ofMinutes(1);
        limiter.record("a@catholic.ac.kr");
        limiter.record("a@catholic.ac.kr");

        assertThat(limiter.countWithin("a@catholic.ac.kr", window)).isEqualTo(2);
        assertThat(limiter.retryAfter("a@catholic.ac.kr", window, 3)).isEmpty();
        assertThat(limiter.retryAfter("a@catholic.ac.kr", window, 2))
                .hasValueSatisfying(d -> assertThat(d).isPositive().isLessThanOrEqualTo(window));
        assertThat(limiter.countWithin("b@catholic.ac.kr", window)).isZero();
    }
}
