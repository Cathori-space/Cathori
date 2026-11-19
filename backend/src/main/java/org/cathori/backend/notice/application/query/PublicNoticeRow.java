package org.cathori.backend.notice.application.query;

import java.time.LocalDate;

public record PublicNoticeRow(
        Long id,
        String category,
        String title,
        String department,
        LocalDate postedAt,
        LocalDate deadlineAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        Long viewCount
) {}
