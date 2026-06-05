package org.cathori.backend.alert.api.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record NotificationItem(
        Long alertHistoryId,
        Long noticeId,
        String title,
        String matchedTag,
        LocalDate deadlineAt,
        boolean isRead,
        OffsetDateTime createdAt
) {}
