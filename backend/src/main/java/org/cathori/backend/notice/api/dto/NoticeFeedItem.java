package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 피드 목록의 단일 공지 카드 DTO. 클라이언트가 카드 UI를 렌더링하는 데 필요한 모든 필드를 담으며,
 * dDay는 마감일 기준 남은 일수(양수=남음, 0=당일, 음수=지남)로 계산되어 내려온다.
 *
 * <pre>
 * {
 *   "noticeId": 42,
 *   "category": "장학",
 *   "title": "2026학년도 1학기 교내 장학금 신청 안내",
 *   "department": "학생처",
 *   "publishedAt": "2026-05-01",
 *   "aiSummary": "교내 장학금 신청 기간은 5/10~5/20이며 성적 3.0 이상 대상입니다.",
 *   "url": "https://...",
 *   "dDay": 5,
 *   "isBookmarked": false
 * }
 * </pre>
 */
public record NoticeFeedItem(
        Long noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        Integer dDay,
        boolean isBookmarked,
        List<String> tags,
        String deadlineAt
) {}
