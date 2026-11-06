package org.cathori.backend.user.application.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;

import org.cathori.backend.common.exception.RateLimitedException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.infra.email.CaffeineSendRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("EmailSendLimitPolicy — 이메일당 1분 3회 · 1시간 10회 (ADR D2 · §7)")
class EmailSendLimitPolicyTest {

    private static final String EMAIL = "student@catholic.ac.kr";

    @Test
    @DisplayName("1분 안에 3번까지는 통과, 4번째는 EMAIL_SEND_TOO_FREQUENT + 첫 발송 후 1분까지 남은 초")
    void fourthSendWithinMinuteIsTooFrequent() {
        // given — 방금 3번 보냈다
        SendRateLimiter limiter = new CaffeineSendRateLimiter(Duration.ofHours(1));
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);
        for (int i = 0; i < 3; i++) {
            assertThatCode(() -> policy.requireSendable(EMAIL)).doesNotThrowAnyException();
            policy.recordSent(EMAIL);
        }

        // when
        RateLimitedException e = catchThrowableOfType(RateLimitedException.class,
                () -> policy.requireSendable(EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
        assertThat(e.getRetryAfterSeconds()).isBetween(1L, 60L);
    }

    @Test
    @DisplayName("1시간 상한에만 걸리면 EMAIL_SEND_LIMIT_EXCEEDED")
    void hourlyLimitExceeded() {
        // given
        SendRateLimiter limiter = mock(SendRateLimiter.class);
        when(limiter.retryAfter(eq(EMAIL), eq(Duration.ofHours(1)), anyInt()))
                .thenReturn(Optional.of(Duration.ofMinutes(20)));
        when(limiter.retryAfter(eq(EMAIL), eq(Duration.ofMinutes(1)), anyInt()))
                .thenReturn(Optional.empty());
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);

        // when
        RateLimitedException e = catchThrowableOfType(RateLimitedException.class,
                () -> policy.requireSendable(EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
        assertThat(e.getRetryAfterSeconds()).isEqualTo(20 * 60);
    }

    @Test
    @DisplayName("두 제한에 다 걸리면 더 오래 기다려야 하는 쪽을 알려준다 — 1분 제한이 더 길 때")
    void bothLimitedMinuteIsLonger() {
        // given — 1시간 상한은 10초 뒤 풀리지만 1분 제한은 50초 뒤 풀린다
        SendRateLimiter limiter = mock(SendRateLimiter.class);
        when(limiter.retryAfter(eq(EMAIL), eq(Duration.ofHours(1)), anyInt()))
                .thenReturn(Optional.of(Duration.ofSeconds(10)));
        when(limiter.retryAfter(eq(EMAIL), eq(Duration.ofMinutes(1)), anyInt()))
                .thenReturn(Optional.of(Duration.ofSeconds(50)));
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);

        // when
        RateLimitedException e = catchThrowableOfType(RateLimitedException.class,
                () -> policy.requireSendable(EMAIL));

        // then — 10초라고 알려주면 그때 다시 보내도 1분 제한에 또 걸린다
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
        assertThat(e.getRetryAfterSeconds()).isEqualTo(50);
    }
}
