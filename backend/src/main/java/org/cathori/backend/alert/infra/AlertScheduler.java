package org.cathori.backend.alert.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.application.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 새 공지사항 알림을 정해진 시각에 자동 발송하는 스케줄러입니다.
 *
 * 매일 오전 11시에 실행되며, 아직 알림을 보내지 않은 새 공지가 있으면
 * 관심 태그가 일치하는 사용자에게 푸시 알림을 발송합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final AlertService alertService;

    /** 매일 오전 11시에 새 공지 알림을 일괄 발송합니다. */
    @Scheduled(cron = "0 0 11 * * *")
    public void dispatchAlerts() {
        log.info("알림 발송 스케줄러 시작");
        alertService.dispatchAlerts();
    }
}
