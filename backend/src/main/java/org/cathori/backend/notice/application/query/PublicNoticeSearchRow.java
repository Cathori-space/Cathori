package org.cathori.backend.notice.application.query;

import java.time.LocalDate;

public record PublicNoticeSearchRow(
        Long id,
        String category,
        String title,
        String department,
        LocalDate postedAt,
        LocalDate deadlineAt
) {}
