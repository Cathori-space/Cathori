package org.cathori.backend.notice.application.crawling;

import lombok.Builder;

/**
 * 목록 페이지 크롤링만으로 얻어지는, 상세 크롤링 이전 단계의 공지 후보.
 *
 * <p>NoticeService가 이 후보의 articleNo를 DB와 대조해 신규 여부를 판별한 뒤,
 * 신규인 것만 CrawlerPort.crawlDetail()로 넘겨 상세 페이지를 크롤링한다.
 *
 * @param articleNo  원본 게시판에서 공지를 식별하는 게시글 번호
 * @param category   공지 분류(목록 표시용 카테고리)
 * @param title      공지 제목
 * @param department 작성 부서/학과명
 * @param postedAt   원본 사이트에 표시된 게시일 문자열
 * @param detailUrl  상세 크롤링(CrawlerPort.crawlDetail) 호출 시 사용할 상세 페이지 URL
 */
@Builder
public record NoticeCandidate(
        String articleNo,
        String category,
        String title,
        String department,
        String postedAt,
        String detailUrl
) {
}
