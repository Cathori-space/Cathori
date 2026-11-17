package org.cathori.backend.notice.api.dto;

import java.time.LocalDate;

public record PublicNoticeSearchItem(
        String noticeId,
        String category,
        String title,
        String department,
        LocalDate publishedAt,
        String deadlineAt
) {}
