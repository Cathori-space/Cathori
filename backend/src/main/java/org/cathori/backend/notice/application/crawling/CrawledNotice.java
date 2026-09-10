package org.cathori.backend.notice.application.crawling;

import lombok.Builder;

import java.util.List;

/**
 * 크롤러가 수집한 공지 데이터를 담는 모델.
 *
 * <p>JsoupCrawler가 학교 사이트에서 파싱한 결과를 담아 반환하며,
 * NoticeService에서 Notice 엔티티로 변환된다.
 *
 * @param articleNo  원본 게시판에서 공지를 식별하는 게시글 번호
 * @param category   공지 분류(목록 표시용 카테고리)
 * @param title      공지 제목
 * @param department 작성 부서/학과명
 * @param postedAt   원본 사이트에 표시된 게시일 문자열
 * @param url        공지 상세 페이지의 원문 URL
 * @param bodyText   본문 텍스트(HTML 태그 제거된 순수 텍스트)
 * @param imageUrls  본문에 포함된 이미지의 절대 URL 목록
 * @param sourceType 공지 출처 유형 (예: "MAIN", "DEPARTMENT")
 * @param sourceId   학과 공지의 경우 학과 코드, 메인 공지는 null
 */
@Builder
public record CrawledNotice(
        String articleNo,
        String category,
        String title,
        String department,
        String postedAt,
        String url,
        String bodyText,
        List<String> imageUrls,
        String sourceType,
        String sourceId
) {
}
