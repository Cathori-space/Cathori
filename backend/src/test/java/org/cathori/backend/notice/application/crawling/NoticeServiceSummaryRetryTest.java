package org.cathori.backend.notice.application.crawling;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.notice.application.AiPort;
import org.cathori.backend.notice.application.AiSummaryResult;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.application.NotificationPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@DisplayName("공지 AI 요약 재시도 통합 테스트")
class NoticeServiceSummaryRetryTest extends IntegrationTestBase {

    @Autowired
    NoticeService noticeService;

    @Autowired
    NoticeRepository noticeRepository;

    @MockitoBean
    AiPort aiPort;

    @MockitoBean
    NotificationPort notificationPort;

    @AfterEach
    void cleanup() {
        noticeRepository.deleteAll();
        reset(aiPort);
    }

    @Test
    @DisplayName("SR-1: 최초 요약 실패는 재시도 횟수에 포함하지 않는다")
    void summarize_initialFailure_doesNotIncreaseRetryCount() {
        Notice notice = savePendingNotice("최초 실패 공지");
        given(aiPort.summarize(anyString(), anyList()))
                .willThrow(new RuntimeException("AI 요약 실패"));

        noticeService.summarize(List.of(notice.getId()));

        Notice reloaded = noticeRepository.findById(notice.getId()).orElseThrow();
        assertThat(reloaded.getAiSummaryStatus()).isEqualTo("FAILED");
        assertThat(reloaded.getAiSummaryRetryCount()).isZero();
    }

    @Test
    @DisplayName("SR-2: 재시도 수행 시 재시도 횟수를 증가시킨다")
    void retrySummary_success_increasesRetryCount() {
        Notice notice = saveFailedNotice("재시도 성공 공지");
        given(aiPort.summarize(anyString(), anyList()))
                .willReturn(new AiSummaryResult(List.of("요약 문장"), null));

        noticeService.retrySummary();

        Notice reloaded = noticeRepository.findById(notice.getId()).orElseThrow();
        assertThat(reloaded.getAiSummaryStatus()).isEqualTo("SUCCESS");
        assertThat(reloaded.getAiSummaryRetryCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("SR-3: 재시도 3회 실패 후에는 재시도 대상에서 제외한다")
    void retrySummary_failedThreeTimes_excludesFromNextRetry() {
        Notice notice = saveFailedNotice("재시도 제한 공지");
        given(aiPort.summarize(anyString(), anyList()))
                .willThrow(new RuntimeException("AI 요약 실패"));

        noticeService.retrySummary();
        noticeService.retrySummary();
        noticeService.retrySummary();

        Notice reloaded = noticeRepository.findById(notice.getId()).orElseThrow();
        assertThat(reloaded.getAiSummaryStatus()).isEqualTo("FAILED");
        assertThat(reloaded.getAiSummaryRetryCount()).isEqualTo(3);
        verify(aiPort, times(3)).summarize(anyString(), anyList());

        clearInvocations(aiPort);
        noticeService.retrySummary();

        verify(aiPort, never()).summarize(anyString(), anyList());
    }

    private Notice saveFailedNotice(String title) {
        Notice notice = Notice.from(crawledNotice(title));
        notice.markSummaryFailed();
        return noticeRepository.save(notice);
    }

    private Notice savePendingNotice(String title) {
        return noticeRepository.save(Notice.from(crawledNotice(title)));
    }

    private CrawledNotice crawledNotice(String title) {
        return CrawledNotice.builder()
                .articleNo(UUID.randomUUID().toString().replace("-", "").substring(0, 10))
                .sourceType("MAIN")
                .sourceId(null)
                .category("일반")
                .title(title)
                .department("테스트학과")
                .postedAt(LocalDate.now().toString())
                .url("https://test.catholic.ac.kr/" + title.hashCode())
                .bodyText("본문")
                .imageUrls(List.of())
                .build();
    }
}
