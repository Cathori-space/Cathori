package org.cathori.backend.notification.infra;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.notification.application.push.RetryDispatchNotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 발송에 실패한 알림을 주기적으로 재시도하는 스케줄러입니다.
 *
 * 20분마다 실행되며, FAILED 상태이고 재시도 횟수가 3회 미만인 이력을 대상으로
 * 알림 재발송을 시도합니다. 3회 모두 실패하면 더 이상 재시도하지 않습니다.
 */
@Component
@RequiredArgsConstructor
public class AlertRetryScheduler {

    private final RetryDispatchNotificationService retryDispatchNotificationService;

    /** 20분마다 실패한 알림 발송을 재시도합니다. */
    @Scheduled(cron = "0 0/20 * * * *")
    public void retryFailedAlerts() {
        retryDispatchNotificationService.retryFailedAlerts();
    }
}
