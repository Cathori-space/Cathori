package org.cathori.backend.user.application.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.infra.email.CaffeineSendRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("EmailSendLimitPolicy — 이메일당 1분 3회 · 1시간 10회 (ADR D2 · §7)")
class EmailSendLimitPolicyTest {

    private static final String EMAIL = "student@catholic.ac.kr";

    @Test
    @DisplayName("1분 안에 3번까지는 통과, 4번째는 EMAIL_SEND_TOO_FREQUENT")
    void fourthSendWithinMinuteIsTooFrequent() {
        // given — 방금 3번 보냈다
        SendRateLimiter limiter = new CaffeineSendRateLimiter(Duration.ofHours(1));
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);
        for (int i = 0; i < 3; i++) {
            assertThatCode(() -> policy.reserve(EMAIL)).doesNotThrowAnyException();
        }

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> policy.reserve(EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
    }

    @Test
    @DisplayName("1시간 상한에 걸리면 1분 제한과 함께 걸려도 EMAIL_SEND_LIMIT_EXCEEDED")
    void hourlyLimitTakesPrecedence() {
        // given — 1시간 10번, 1분 3번 모두 찼다
        SendRateLimiter limiter = mock(SendRateLimiter.class);
        when(limiter.countWithin(eq(EMAIL), eq(Duration.ofHours(1)))).thenReturn(10);
        when(limiter.countWithin(eq(EMAIL), eq(Duration.ofMinutes(1)))).thenReturn(3);
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> policy.reserve(EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_LIMIT_EXCEEDED);
    }

    @Test
    @DisplayName("되돌린 선점은 횟수에서 빠져, 그 자리로 다시 보낼 수 있다")
    void releasedReservationFreesSlot() {
        // given — 3번 선점해 1분 한도가 찼다
        SendRateLimiter limiter = new CaffeineSendRateLimiter(Duration.ofHours(1));
        EmailSendLimitPolicy policy = new EmailSendLimitPolicy(limiter, 3, 10);
        policy.reserve(EMAIL);
        policy.reserve(EMAIL);
        Instant failed = policy.reserve(EMAIL);

        // when — 마지막 발송이 실패해 되돌린다
        policy.release(EMAIL, failed);

        // then — 한 자리가 비어 다시 선점할 수 있다
        assertThat(limiter.countWithin(EMAIL, Duration.ofMinutes(1))).isEqualTo(2);
        assertThatCode(() -> policy.reserve(EMAIL)).doesNotThrowAnyException();
    }
}
