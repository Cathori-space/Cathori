package org.cathori.backend.notice.application.crawling;

import lombok.Builder;
import lombok.Getter;

/**
 * 목록 페이지 크롤링만으로 얻어지는, 상세 크롤링 이전 단계의 공지 후보.
 *
 * <p>NoticeService가 이 후보의 articleNo를 DB와 대조해 신규 여부를 판별한 뒤,
 * 신규인 것만 CrawlerPort.crawlDetail()로 넘겨 상세 페이지를 크롤링한다.
 */
@Getter
@Builder
public class NoticeCandidate {

    /** 원본 게시판에서 공지를 식별하는 게시글 번호 */
    private String articleNo;
    /** 공지 분류(목록 표시용 카테고리) */
    private String category;
    /** 공지 제목 */
    private String title;
    /** 작성 부서/학과명 */
    private String department;
    /** 원본 사이트에 표시된 게시일 문자열 */
    private String postedAt;
    /** 상세 크롤링(CrawlerPort.crawlDetail) 호출 시 사용할 상세 페이지 URL */
    private String detailUrl;
}
