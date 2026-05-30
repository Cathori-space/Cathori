package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.domain.AlertHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface AlertHistoryJpaRepository extends JpaRepository<AlertHistory, Long> {

    @Query("SELECT ah.noticeId FROM AlertHistory ah")
    Set<Long> findAllSentNoticeIds();

    @Query("SELECT ah FROM AlertHistory ah WHERE ah.status = 'FAILED' AND ah.retryCount < 3")
    List<AlertHistory> findFailedForRetry();
}
