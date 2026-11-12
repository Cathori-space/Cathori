package org.cathori.backend.user.infra.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CaffeineSendRateLimiter 이메일 단위 집계")
class CaffeineSendRateLimiterTest {

    private final CaffeineSendRateLimiter limiter = new CaffeineSendRateLimiter(Duration.ofHours(1));

    @Test
    @DisplayName("윈도우 안의 발송 횟수를 이메일별로 따로 센다")
    void countsPerEmail() {
        // given — a@ 로 2회 발송
        limiter.record("a@catholic.ac.kr");
        limiter.record("a@catholic.ac.kr");

        // when
        int a = limiter.countWithin("a@catholic.ac.kr", Duration.ofMinutes(1));
        int b = limiter.countWithin("b@catholic.ac.kr", Duration.ofMinutes(1));

        // then
        assertThat(a).isEqualTo(2);
        assertThat(b).isZero();
    }

    @Test
    @DisplayName("remove는 돌려받은 기록 1건만 지운다")
    void removeDeletesOnlyThatRecord() {
        // given — 2번 기록했다
        limiter.record("a@catholic.ac.kr");
        Instant second = limiter.record("a@catholic.ac.kr");

        // when
        limiter.remove("a@catholic.ac.kr", second);

        // then
        assertThat(limiter.countWithin("a@catholic.ac.kr", Duration.ofMinutes(1))).isEqualTo(1);
    }

    @Test
    @DisplayName("마지막 기록을 지우면 횟수는 0이고, 다시 기록할 수 있다")
    void removeLastRecordLeavesEmptyHistory() {
        // given
        Instant only = limiter.record("a@catholic.ac.kr");

        // when
        limiter.remove("a@catholic.ac.kr", only);

        // then
        assertThat(limiter.countWithin("a@catholic.ac.kr", Duration.ofHours(1))).isZero();
        limiter.record("a@catholic.ac.kr");
        assertThat(limiter.countWithin("a@catholic.ac.kr", Duration.ofHours(1))).isEqualTo(1);
    }
}
