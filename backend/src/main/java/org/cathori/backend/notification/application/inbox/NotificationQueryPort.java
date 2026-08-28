package org.cathori.backend.notification.application.inbox;

import java.util.List;

public interface NotificationQueryPort {
    List<NotificationRow> findByUserIdWithCursor(Long userId, Long cursor, int limit);
}
