package org.cathori.backend;


import com.google.firebase.FirebaseApp;
import org.cathori.backend.notification.infra.PushNotificationScheduler;
import org.cathori.backend.notice.infra.crawling.CrawlingScheduler;
import org.cathori.backend.notice.infra.summarization.RetryScheduler;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    // 테스트 컨텍스트에서 시작 이벤트, 예약 작업, Firebase 인증 정보 로딩을 차단한다.
    @MockitoBean CrawlingScheduler crawlingScheduler;
    @MockitoBean RetryScheduler retryScheduler;
    @MockitoBean PushNotificationScheduler pushNotificationScheduler;
    @MockitoBean FirebaseApp firebaseApp;
}
