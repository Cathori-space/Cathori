package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.application.AlertHistoryRepository;
import org.cathori.backend.alert.domain.AlertHistory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class AlertHistoryRepositoryImpl implements AlertHistoryRepository {

    private final AlertHistoryJpaRepository jpaRepository;

    public AlertHistoryRepositoryImpl(AlertHistoryJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public void saveAll(List<AlertHistory> logs) {
        jpaRepository.saveAll(logs);
    }

    @Override
    public List<AlertHistory> findFailedForRetry() {
        return jpaRepository.findFailedForRetry();
    }

    @Override
    public List<Long> findUserIdsByNoticeId(Long noticeId) {
        return jpaRepository.findUserIdsByNoticeId(noticeId);
    }

    @Override
    public AlertHistory save(AlertHistory log) {
        return jpaRepository.save(log);
    }

    @Override
    public void markSuccessForUsers(Long noticeId, List<Long> userIds) {
        if (userIds.isEmpty()) return;
        jpaRepository.markSuccessForUsers(noticeId, userIds);
    }

    @Override
    public void markFailedForUsers(Long noticeId, List<Long> userIds) {
        if (userIds.isEmpty()) return;
        jpaRepository.markFailedForUsers(noticeId, userIds);
    }

    @Override
    public void incrementRetryForUsers(Long noticeId, List<Long> userIds) {
        if (userIds.isEmpty()) return;
        jpaRepository.incrementRetryForUsers(noticeId, userIds);
    }

    @Override
    public Optional<AlertHistory> findByIdAndUserId(Long id, Long userId) {
        return jpaRepository.findByIdAndUserId(id, userId);
    }
}
