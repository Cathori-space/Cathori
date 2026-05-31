package org.cathori.backend.alert.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AlertHistory 단위 테스트")
class AlertHistoryTest {

    @Test
    @DisplayName("AH-1: success() → status=SUCCESS, retryCount=0")
    void success_factory() {
        AlertHistory history = AlertHistory.success(1L);

        assertThat(history.getStatus()).isEqualTo("SUCCESS");
        assertThat(history.getRetryCount()).isEqualTo(0);
        assertThat(history.getNoticeId()).isEqualTo(1L);
        assertThat(history.getCreatedAt()).isNotNull();
        assertThat(history.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("AH-2: partialSuccess() → status=PARTIAL_SUCCESS, retryCount=0")
    void partialSuccess_factory() {
        AlertHistory history = AlertHistory.partialSuccess(2L);

        assertThat(history.getStatus()).isEqualTo("PARTIAL_SUCCESS");
        assertThat(history.getRetryCount()).isEqualTo(0);
        assertThat(history.getNoticeId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("AH-3: failed() → status=FAILED, retryCount=0")
    void failed_factory() {
        AlertHistory history = AlertHistory.failed(3L);

        assertThat(history.getStatus()).isEqualTo("FAILED");
        assertThat(history.getRetryCount()).isEqualTo(0);
        assertThat(history.getNoticeId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("AH-4: markSuccess() → status가 SUCCESS로 변경됨")
    void markSuccess_changesStatus() {
        AlertHistory history = AlertHistory.failed(1L);

        history.markSuccess();

        assertThat(history.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("AH-5: incrementRetry() → 호출할 때마다 retryCount 1 증가")
    void incrementRetry_incrementsCount() {
        AlertHistory history = AlertHistory.failed(1L);

        history.incrementRetry();
        assertThat(history.getRetryCount()).isEqualTo(1);

        history.incrementRetry();
        assertThat(history.getRetryCount()).isEqualTo(2);
    }
}
