package org.cathori.backend.notification.infra;

import org.cathori.backend.notification.application.push.PushNotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class PushNotificationSchedulerTest {

    @TempDir Path stateDirectory;

    @Test
    @DisplayName("유지보수 마커가 있는 동안 신규 발송과 재시도를 중단한다")
    void maintenancePausesBothJobs() throws Exception {
        var service = mock(PushNotificationService.class);
        Path marker = Files.createFile(stateDirectory.resolve("enabled"));
        var scheduler = new PushNotificationScheduler(service, marker.toString());

        scheduler.sendNoticeNotifications();
        scheduler.retryFailedNotifications();
        verifyNoInteractions(service);

        Files.delete(marker);
        scheduler.sendNoticeNotifications();
        scheduler.retryFailedNotifications();
        verify(service).sendNoticeNotifications();
        verify(service).retryFailedNotifications();
    }

    @Test
    @DisplayName("운영 유지보수 디렉터리가 연결되지 않으면 발송을 중단한다")
    void missingMaintenanceDirectoryPausesBothJobs() {
        var service = mock(PushNotificationService.class);
        var scheduler = new PushNotificationScheduler(service, stateDirectory.resolve("missing/enabled").toString());

        scheduler.sendNoticeNotifications();
        scheduler.retryFailedNotifications();

        verifyNoInteractions(service);
    }
}
