package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;

public record PublicNoticeDetailResponse(
        String noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        Long viewCount,
        String deadlineAt
) {}
