package org.cathori.backend.alert.application;

import java.util.List;

public interface NotificationQueryPort {
    List<NotificationRow> findByUserIdWithCursor(Long userId, Long cursor, int limit);
}
