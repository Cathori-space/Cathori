package org.cathori.backend.alert.infra;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.alert.domain.AlertHistory;
import org.cathori.backend.user.application.NotificationPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Set;

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
    @DisplayName("R-1: findAllSentNoticeIds() - 저장된 모든 이력의 noticeId Set 반환")
    void findAllSentNoticeIds_returnsAllIds() {
        alertHistoryJpaRepository.save(AlertHistory.success(10L));
        alertHistoryJpaRepository.save(AlertHistory.failed(20L));
        alertHistoryJpaRepository.save(AlertHistory.partialSuccess(30L));

        Set<Long> ids = alertHistoryJpaRepository.findAllSentNoticeIds();

        assertThat(ids).containsExactlyInAnyOrder(10L, 20L, 30L);
    }

    @Test
    @DisplayName("R-2: findAllSentNoticeIds() - 이력 없으면 빈 Set 반환")
    void findAllSentNoticeIds_returnsEmptySetWhenNoHistory() {
        Set<Long> ids = alertHistoryJpaRepository.findAllSentNoticeIds();

        assertThat(ids).isEmpty();
    }

    @Test
    @DisplayName("R-3: findFailedForRetry() - FAILED이고 retryCount < 3인 이력 반환")
    void findFailedForRetry_returnsFailedWithinRetryLimit() {
        AlertHistory retryCount0 = AlertHistory.failed(1L);
        AlertHistory retryCount1 = AlertHistory.failed(2L);
        retryCount1.incrementRetry();
        AlertHistory retryCount2 = AlertHistory.failed(3L);
        retryCount2.incrementRetry();
        retryCount2.incrementRetry();

        alertHistoryJpaRepository.save(retryCount0);
        alertHistoryJpaRepository.save(retryCount1);
        alertHistoryJpaRepository.save(retryCount2);

        List<AlertHistory> result = alertHistoryJpaRepository.findFailedForRetry();

        assertThat(result).hasSize(3);
        assertThat(result.stream().map(AlertHistory::getNoticeId))
                .containsExactlyInAnyOrder(1L, 2L, 3L);
    }

    @Test
    @DisplayName("R-4: findFailedForRetry() - SUCCESS, PARTIAL_SUCCESS 이력은 제외")
    void findFailedForRetry_excludesNonFailedStatuses() {
        alertHistoryJpaRepository.save(AlertHistory.success(1L));
        alertHistoryJpaRepository.save(AlertHistory.partialSuccess(2L));
        alertHistoryJpaRepository.save(AlertHistory.failed(3L));

        List<AlertHistory> result = alertHistoryJpaRepository.findFailedForRetry();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getNoticeId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("R-5: findFailedForRetry() - retryCount=3인 FAILED 이력은 제외 (경계값)")
    void findFailedForRetry_excludesMaxRetryCount() {
        AlertHistory maxRetry = AlertHistory.failed(1L);
        maxRetry.incrementRetry();
        maxRetry.incrementRetry();
        maxRetry.incrementRetry();
        alertHistoryJpaRepository.save(maxRetry);

        List<AlertHistory> result = alertHistoryJpaRepository.findFailedForRetry();

        assertThat(result).isEmpty();
    }
}
