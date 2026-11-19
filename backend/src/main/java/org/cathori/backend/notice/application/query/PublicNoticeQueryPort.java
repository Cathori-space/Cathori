package org.cathori.backend.notice.application.query;

import java.util.List;
import java.util.Optional;

/**
 * 학교 공통 공지(MAIN) 공개 조회를 위한 포트.
 * 피드와 검색은 hasNext 판정을 위해 size + 1건까지 반환한다.
 */
public interface PublicNoticeQueryPort {
    List<PublicNoticeRow> findFeed(String category, int page, int size);

    List<PublicNoticeSearchRow> findSearch(String keyword, int page, int size);

    /** 미존재와 접근 불가를 구분하기 위해 MAIN 외 공지도 출처 정보만 조회한다. */
    Optional<String> findSourceType(Long noticeId);

    Optional<PublicNoticeRow> findMainDetail(Long noticeId);
}
