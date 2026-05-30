package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.application.AlertHistoryRepository;
import org.cathori.backend.alert.domain.AlertHistory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public class AlertHistoryRepositoryImpl implements AlertHistoryRepository {

    private final AlertHistoryJpaRepository jpaRepository;

    public AlertHistoryRepositoryImpl(AlertHistoryJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Set<Long> findAllSentNoticeIds() {
        return jpaRepository.findAllSentNoticeIds();
    }

    @Override
    public List<AlertHistory> findFailedForRetry() {
        return jpaRepository.findFailedForRetry();
    }

    @Override
    public AlertHistory save(AlertHistory history) {
        return jpaRepository.save(history);
    }
}
