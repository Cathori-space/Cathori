package org.cathori.backend.alert.application;

import org.cathori.backend.alert.domain.AlertHistory;

import java.util.List;
import java.util.Set;

public interface AlertHistoryRepository {
    Set<Long> findAllSentNoticeIds();
    List<AlertHistory> findFailedForRetry();
    AlertHistory save(AlertHistory history);
}
