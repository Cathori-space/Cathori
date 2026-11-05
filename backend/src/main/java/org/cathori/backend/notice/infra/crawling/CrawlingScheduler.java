package org.cathori.backend.notice.infra.crawling;

import java.util.List;

import org.cathori.backend.notice.application.crawling.CrawledNotice;
import org.cathori.backend.notice.application.crawling.NoticeService;
import org.cathori.backend.notice.infra.crawling.source.DepartmentSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlingScheduler {

    private final NoticeService noticeService;

    /** 기동 직후 1회 크롤링 여부. 테스트 프로파일은 false — 외부 사이트에 의존하지 않도록. */
    @Value("${crawler.run-on-startup:true}")
    private boolean runOnStartup;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (!runOnStartup) {
            log.info("crawler.run-on-startup=false, 기동 크롤링 생략");
            return;
        }
        log.info("컨테이너 기동 감지, 크롤링 1회 실행");
        scheduleCrawling();
    }

    @Scheduled(cron = "${crawler.dispatch.cron}")
    public void scheduleCrawling() {
        log.info("스케줄러 시작");
        int total = crawlSource("MAIN", null, "MAIN");

        for (DepartmentSource department : DepartmentSource.values()) {
            total += crawlSource("DEPARTMENT", department.name(), department.getDisplayName());
        }

        log.info("크롤링 완료. 총 신규 공지: {}", total);
    }

    /**
     * 소스 하나를 수집·저장·요약한다. 실패는 이 소스 안에서 끝낸다 —
     * 한 소스의 예외가 회차 전체(나머지 소스)를 멈추지 않게 MAIN·학과가 같은 경로를 탄다.
     *
     * @return 신규 공지 수 (실패 시 0)
     */
    int crawlSource(String sourceType, String sourceId, String displayName) {
        try {
            List<CrawledNotice> crawled = noticeService.crawl(sourceType, sourceId);
            List<Long> ids = noticeService.save(crawled);
            noticeService.summarize(ids);
            log.info("{} 신규 공지 개수: {}", displayName, ids.size());
            return ids.size();
        } catch (Exception e) {
            log.warn("{} 수집 실패, 스킵", displayName, e);
            return 0;
        }
    }
}
