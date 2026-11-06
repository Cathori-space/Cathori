package org.cathori.backend.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("RateLimitedException — 남은 시간을 올림한 초로 변환")
class RateLimitedExceptionTest {

    @Test
    @DisplayName("소수점 이하가 있으면 올림, 정수 초는 그대로")
    void ceilsFractionalSeconds() {
        // given
        Duration fractional = Duration.ofMillis(41_200);
        Duration exact = Duration.ofSeconds(42);

        // when
        long fromFractional = RateLimitedException.toSecondsCeil(fractional);
        long fromExact = RateLimitedException.toSecondsCeil(exact);

        // then
        assertThat(fromFractional).isEqualTo(42);
        assertThat(fromExact).isEqualTo(42);
    }

    @Test
    @DisplayName("0 이하·1초 미만·null은 최소 1초 — 0초라고 알려 즉시 재시도하게 만들지 않는다")
    void atLeastOneSecond() {
        // given
        List<Duration> tooShort = Arrays.asList(
                Duration.ZERO, Duration.ofSeconds(-3), Duration.ofMillis(300), null);

        // when
        List<Long> seconds = tooShort.stream().map(RateLimitedException::toSecondsCeil).toList();

        // then
        assertThat(seconds).containsOnly(1L);
    }
}
