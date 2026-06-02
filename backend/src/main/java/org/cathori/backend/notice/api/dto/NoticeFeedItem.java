package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Notice card item for the feed response.
 */
public record NoticeFeedItem(
        String noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        Long viewCount,
        boolean isBookmarked,
        List<String> tags,
        String deadlineAt
) {}
