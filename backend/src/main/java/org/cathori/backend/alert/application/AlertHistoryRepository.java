package org.cathori.backend.alert.application;

import org.cathori.backend.alert.domain.AlertHistory;

import java.util.List;

public interface AlertHistoryRepository {

    void saveAll(List<AlertHistory> logs);

    List<AlertHistory> findFailedForRetry();

    List<Long> findUserIdsByNoticeId(Long noticeId);

    AlertHistory save(AlertHistory log);

    void markSuccessForUsers(Long noticeId, List<Long> userIds);

    void markFailedForUsers(Long noticeId, List<Long> userIds);

    void incrementRetryForUsers(Long noticeId, List<Long> userIds);
}