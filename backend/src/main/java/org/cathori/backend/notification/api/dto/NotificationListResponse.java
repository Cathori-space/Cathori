package org.cathori.backend.notification.api.dto;

import java.util.List;

public record NotificationListResponse(
        List<NotificationItem> alerts,
        Long nextCursor,
        boolean hasNext
) {}
