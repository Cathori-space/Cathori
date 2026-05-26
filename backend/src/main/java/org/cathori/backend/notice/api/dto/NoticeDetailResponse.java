package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;

public record NoticeDetailResponse(
        Long noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        boolean isBookmarked,
        Integer dDay
) {}
