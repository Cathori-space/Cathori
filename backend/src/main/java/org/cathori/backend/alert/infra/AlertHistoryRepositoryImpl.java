package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.application.AlertHistoryRepository;
import org.cathori.backend.alert.domain.AlertHistory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

/**
 * AlertHistoryRepository 인터페이스의 실제 구현체입니다.
 *
 * AlertService는 이 클래스를 직접 참조하지 않고 AlertHistoryRepository 인터페이스를 통해 접근합니다.
 * 실제 데이터베이스 쿼리는 AlertHistoryJpaRepository에 위임합니다.
 */
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
