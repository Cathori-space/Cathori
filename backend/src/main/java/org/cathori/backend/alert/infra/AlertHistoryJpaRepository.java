package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.domain.AlertHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface AlertHistoryJpaRepository extends JpaRepository<AlertHistory, Long> {

    /** 알림 발송 이력이 존재하는 모든 공지사항 ID를 조회합니다. */
    @Query("SELECT ah.noticeId FROM AlertHistory ah")
    Set<Long> findAllSentNoticeIds();

    /** 상태가 FAILED이고 재시도 횟수가 3회 미만인 이력을 조회합니다. */
    @Query("SELECT ah FROM AlertHistory ah WHERE ah.status = 'FAILED' AND ah.retryCount < 3")
    List<AlertHistory> findFailedForRetry();
}
