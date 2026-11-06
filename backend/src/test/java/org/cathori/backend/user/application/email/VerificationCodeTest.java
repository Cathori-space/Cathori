package org.cathori.backend.user.application.email;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("VerificationCode 만료·실패 누적")
class VerificationCodeTest {

    private static final Instant T0 = Instant.parse("2026-11-06T00:00:00Z");
    private static final Duration TTL = Duration.ofMinutes(3);

    @Test
    @DisplayName("만료 시각 정각까지는 유효하고, 그 뒤부터 만료다")
    void expiryBoundary() {
        // given
        VerificationCode code = VerificationCode.issue("123456", T0, TTL);

        // when
        boolean atExpiry = code.isExpired(T0.plus(TTL));
        boolean justAfter = code.isExpired(T0.plus(TTL).plusMillis(1));

        // then
        assertThat(atExpiry).isFalse();
        assertThat(justAfter).isTrue();
    }
}
