package org.cathori.backend.notice.application.query;

import java.util.List;

/**
 * 공지 피드/북마크/검색 조회를 위한 포트. 구현체는 hasNext 판정을 호출부에서 할 수 있도록
 * 각 쿼리의 size보다 1건 더({@code size + 1}) 조회해서 반환해야 한다.
 */
public interface NoticeFeedPort {
    List<NoticeQueryResult> findFeed(NoticeFeedQuery query);
    List<NoticeQueryResult> findBookmarked(BookmarkedNoticeQuery query);
    List<NoticeSearchQueryResult> findSearch(NoticeSearchQuery query);
}
