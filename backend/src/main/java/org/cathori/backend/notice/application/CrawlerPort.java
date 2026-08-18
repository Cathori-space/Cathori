package org.cathori.backend.notice.application;

import java.util.List;


/**
 * 가톨릭대 공지사항 크롤러 인터페이스
 *
 * 크롤러 구현체(JsoupCrawler)와 서비스(NoticeService) 사이의 계약을 정의한다.
 * NoticeService는 이 인터페이스만 바라보기 때문에,
 * 나중에 크롤러 구현체를 교체하거나 추가해도 NoticeService 코드는 건드리지 않아도 된다.
 *
 * @param sourceType 출처 유형 (예: "MAIN")
 * @param sourceId   학과 공지의 경우 학과 코드, 메인 공지는 null
 * @param lastArticleNo DB에 저장된 가장 최신 articleNo. 이 값 이하의 공지는 수집하지 않는다.
 *                      0이면 중단 조건 없이 전체 수집 (최초 실행 시)
 * @return 새로 수집된 공지 목록 (이미 저장된 공지 제외)
 */
public interface CrawlerPort {
    List<CrawledNotice> crawl(String sourceType, String sourceId, int lastArticleNo);
}