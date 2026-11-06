package org.cathori.backend.notice.infra.crawling;

import org.cathori.backend.notice.application.crawling.NoticeService;
import org.cathori.backend.notice.infra.crawling.source.DepartmentSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@DisplayName("CrawlingScheduler 소스 단위 실패 격리")
class CrawlingSchedulerTest {

    @Test
    @DisplayName("MAIN 저장이 실패해도 학과 수집은 전부 진행된다")
    void mainFailureDoesNotStopDepartments() {
        NoticeService noticeService = mock(NoticeService.class);
        given(noticeService.crawl(eq("MAIN"), isNull())).willReturn(List.of());
        given(noticeService.save(anyList()))
                .willThrow(new RuntimeException("value too long for type character varying(200)"))
                .willReturn(List.of());

        new CrawlingScheduler(noticeService).scheduleCrawling();

        verify(noticeService, times(DepartmentSource.values().length))
                .crawl(eq("DEPARTMENT"), org.mockito.ArgumentMatchers.anyString());
        // 저장 실패한 MAIN은 요약 단계로 넘어가지 않는다 — 학과 수만큼만 호출
        verify(noticeService, times(DepartmentSource.values().length)).summarize(anyList());
    }
}
