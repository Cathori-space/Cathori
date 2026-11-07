package org.cathori.backend.notification.api.dto;

import java.util.List;

public record MarkNotificationsReadResponse(
        List<Long> readAlertHistoryIds
) {
}
