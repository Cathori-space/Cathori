package org.cathori.backend;


import com.google.firebase.FirebaseApp;
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

    // API 테스트에서는 실제 공지 크롤링, 예약된 AI 재시도 및 실제 인증 정보 로딩을 수행하지 않는다.
    @MockitoBean CrawlingScheduler crawlingScheduler;
    @MockitoBean RetryScheduler retryScheduler;
    @MockitoBean FirebaseApp firebaseApp;
}
