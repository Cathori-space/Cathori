package org.cathori.backend.alert.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.application.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final AlertService alertService;

    @Scheduled(cron = "0 0 11 * * *")
    public void dispatchAlerts() {
        log.info("알림 발송 스케줄러 시작");
        alertService.dispatchAlerts();
    }
}
