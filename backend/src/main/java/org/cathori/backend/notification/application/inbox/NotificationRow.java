package org.cathori.backend.notification.application.inbox;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record NotificationRow(
        Long alertHistoryId,
        Long noticeId,
        String title,
        LocalDate deadlineAt,
        String matchedTag,
        boolean isRead,
        LocalDateTime createdAt
) {}
