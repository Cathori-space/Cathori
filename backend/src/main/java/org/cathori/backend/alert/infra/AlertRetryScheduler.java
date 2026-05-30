package org.cathori.backend.alert.infra;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.alert.application.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AlertRetryScheduler {

    private final AlertService alertService;

    @Scheduled(cron = "0 0/20 * * * *")
    public void retryFailedAlerts() {
        alertService.retryFailedAlerts();
    }
}
