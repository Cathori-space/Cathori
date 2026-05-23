package org.cathori.backend.notice.api.dto;

import java.util.List;


/**
 * 공지사항 피드 페이지 응답 DTO. 사용자가 피드 화면에서 공지 목록을 스크롤할 때 반환되며,
 * 각 항목에는 AI 요약·D-Day·북마크 여부가 포함되어 클라이언트가 별도 요청 없이 카드 UI를 렌더링할 수 있다.
 *
 * <pre>
 * {
 *   "content": [
 *     {
 *       "noticeId": 42,
 *       "category": "장학",
 *       "title": "2026학년도 1학기 교내 장학금 신청 안내",
 *       "department": "학생처",
 *       "publishedAt": "2026-05-01",
 *       "aiSummary": "교내 장학금 신청 기간은 5/10~5/20이며 성적 3.0 이상 대상입니다.",
 *       "url": "https://...",
 *       "dDay": -3,
 *       "isBookmarked": false
 *     }
 *   ],
 *   "page": 0,
 *   "size": 20,
 *   "hasNext": true
 * }
 * </pre>
 */
public record NoticeFeedResponse(
        List<NoticeFeedItem> content,
        int page,
        int size,
        boolean hasNext
) {}
