package org.cathori.backend.notification.infra;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.notification.domain.AlertHistory;
import org.cathori.backend.user.application.NotificationPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AlertHistoryRepository 쿼리 테스트")
class AlertHistoryRepositoryTest extends IntegrationTestBase {

    @Autowired
    AlertHistoryJpaRepository alertHistoryJpaRepository;
    @MockitoBean
    NotificationPort notificationPort;

    @AfterEach
    void cleanup() {
        alertHistoryJpaRepository.deleteAll();
    }

    @Test
    @DisplayName("R-1: findFailedForRetry() — retryCount=0,1,2인 FAILED 이력 반환")
    void findFailedForRetry_returnsFailedWithRetryCountUnder3() {
        AlertHistory h0 = AlertHistory.create(1L, 1L, null);
        h0.markFailed();

        AlertHistory h1 = AlertHistory.create(2L, 2L, null);
        h1.markFailed();
        h1.incrementRetry();

        AlertHistory h2 = AlertHistory.create(3L, 3L, null);
        h2.markFailed();
        h2.incrementRetry();
        h2.incrementRetry();

        alertHistoryJpaRepository.save(h0);
        alertHistoryJpaRepository.save(h1);
        alertHistoryJpaRepository.save(h2);

        List<AlertHistory> result = alertHistoryJpaRepository.findFailedForRetry();

        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("R-2: findFailedForRetry() — retryCount=3인 FAILED 이력 제외 (경계값)")
    void findFailedForRetry_excludesRetryCount3() {
        AlertHistory h = AlertHistory.create(1L, 1L, null);
        h.markFailed();
        h.incrementRetry();
        h.incrementRetry();
        h.incrementRetry();
        alertHistoryJpaRepository.save(h);

        List<AlertHistory> result = alertHistoryJpaRepository.findFailedForRetry();

        assertThat(result).isEmpty();
    }
}
