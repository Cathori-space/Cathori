package org.cathori.backend.alert.application;

import org.cathori.backend.alert.domain.AlertHistory;

import java.util.List;
import java.util.Optional;

public interface AlertHistoryRepository {

    void saveAll(List<AlertHistory> logs);

    List<AlertHistory> findFailedForRetry();

    AlertHistory save(AlertHistory log);

    void markSuccessForUsers(Long noticeId, List<Long> userIds);

    void markFailedForUsers(Long noticeId, List<Long> userIds);

    void incrementRetryForUsers(Long noticeId, List<Long> userIds);

    Optional<AlertHistory> findByIdAndUserId(Long id, Long userId);

    void deleteByUserId(Long userId);
}
