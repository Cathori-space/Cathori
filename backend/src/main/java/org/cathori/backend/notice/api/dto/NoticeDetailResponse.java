package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;
import java.util.List;

public record NoticeDetailResponse(
        String noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        boolean isBookmarked,
        Integer dDay,
        Long viewCount,
        List<String> tags,
        String deadlineAt
) {}
