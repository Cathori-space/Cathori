package org.cathori.backend.notification.infra;

import org.cathori.backend.notification.application.push.PushNotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 새 공지사항 알림을 정해진 시각에 자동 발송하는 스케줄러입니다.
 *
 * 매일 오전 11시에 실행되며, 아직 알림을 보내지 않은 새 공지가 있으면
 * 관심 태그가 일치하는 사용자에게 푸시 알림을 발송합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PushNotificationScheduler {

    private final PushNotificationService pushNotificationService;

    /**
     * 새 공지 알림을 일괄 발송합니다. (기본: 매일 오전 11시)
     *
     * cron은 {@code alert.dispatch.cron} 프로퍼티로 외부화되어, 로컬 테스트 시
     * 코드 변경 없이 발송 주기를 짧게 덮어쓸 수 있습니다.
     */
    @Scheduled(cron = "${alert.dispatch.cron:0 0 11 * * *}")
    public void dispatchAlerts() {
        log.info("알림 발송 스케줄러 시작");
        pushNotificationService.dispatchAlerts();
    }

    /** 20분마다 실패한 알림 발송을 재시도합니다. */
    @Scheduled(cron = "0 0/20 * * * *")
    public void retryFailedAlerts() {
        pushNotificationService.retryFailedAlerts();
    }

}
