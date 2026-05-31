package org.cathori.backend.alert.application;

import org.cathori.backend.alert.domain.AlertHistory;

import java.util.List;
import java.util.Set;

/**
 * 알림 발송 이력 저장소의 기능 명세입니다.
 *
 * AlertService가 이력을 조회하거나 저장할 때 사용하는 창구입니다.
 * 실제 데이터베이스 접근은 AlertHistoryRepositoryImpl이 담당합니다.
 */
public interface AlertHistoryRepository {

    /** 지금까지 알림을 발송한 적 있는 공지사항 ID 목록을 반환합니다. (중복 발송 방지에 사용) */
    Set<Long> findAllSentNoticeIds();

    /** 발송에 실패했고 재시도 횟수가 3회 미만인 이력 목록을 반환합니다. */
    List<AlertHistory> findFailedForRetry();

    /** 알림 발송 이력을 저장하거나 갱신합니다. */
    AlertHistory save(AlertHistory history);
}
