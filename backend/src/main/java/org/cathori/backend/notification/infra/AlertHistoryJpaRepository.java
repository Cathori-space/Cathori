package org.cathori.backend.notification.infra;

import org.cathori.backend.notification.domain.AlertHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AlertHistoryJpaRepository extends JpaRepository<AlertHistory, Long> {

    @Query("SELECT ah FROM AlertHistory ah WHERE ah.alarmStatus = 'FAILED' AND ah.retryCount < 3")
    List<AlertHistory> findFailedForRetry();

    @Query("SELECT ah.userId FROM AlertHistory ah WHERE ah.noticeId = :noticeId")
    List<Long> findUserIdsByNoticeId(@Param("noticeId") Long noticeId);

    @Query("SELECT ah.userId FROM AlertHistory ah WHERE ah.noticeId = :noticeId AND ah.alarmStatus = 'PENDING'")
    List<Long> findPendingUserIdsByNoticeId(@Param("noticeId") Long noticeId);

    @Modifying
    @Query("UPDATE AlertHistory ah SET ah.alarmStatus = 'SUCCESS' WHERE ah.noticeId = :noticeId AND ah.userId IN :userIds")
    void markSuccessForUsers(@Param("noticeId") Long noticeId, @Param("userIds") List<Long> userIds);

    @Modifying
    @Query("UPDATE AlertHistory ah SET ah.alarmStatus = 'FAILED' WHERE ah.noticeId = :noticeId AND ah.userId IN :userIds")
    void markFailedForUsers(@Param("noticeId") Long noticeId, @Param("userIds") List<Long> userIds);

    @Modifying
    @Query("UPDATE AlertHistory ah SET ah.retryCount = ah.retryCount + 1 WHERE ah.noticeId = :noticeId AND ah.userId IN :userIds")
    void incrementRetryForUsers(@Param("noticeId") Long noticeId, @Param("userIds") List<Long> userIds);

    Optional<AlertHistory> findByIdAndUserId(Long id, Long userId);

    void deleteByUserId(Long userId);
}
