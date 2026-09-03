package org.cathori.backend.notification.application.inbox;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.notification.AlertErrorCode;
import org.cathori.backend.notification.api.dto.NotificationItem;
import org.cathori.backend.notification.api.dto.NotificationListResponse;
import org.cathori.backend.notification.domain.AlertHistory;
import org.cathori.backend.notification.domain.AlertHistoryRepository;
import org.cathori.backend.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationQueryPort notificationQueryPort;
    private final AlertHistoryRepository alertHistoryRepository;

    public NotificationListResponse listNotifications(Long userId, Long cursor, int size) {
        List<NotificationRow> rows = notificationQueryPort.findByUserIdWithCursor(userId, cursor, size + 1);

        boolean hasNext = rows.size() > size;
        List<NotificationRow> page = hasNext ? rows.subList(0, size) : rows;

        List<NotificationItem> items = page.stream()
                .map(row -> new NotificationItem(
                        row.alertHistoryId(),
                        row.noticeId(),
                        row.title(),
                        row.matchedTag(),
                        row.deadlineAt(),
                        row.isRead(),
                        row.createdAt().atOffset(ZoneOffset.ofHours(9))
                ))
                .toList();

        Long nextCursor = hasNext ? page.get(page.size() - 1).alertHistoryId() : null;

        return new NotificationListResponse(items, nextCursor, hasNext);
    }

    @Transactional
    public void markRead(Long userId, Long alertHistoryId) {
        AlertHistory alertHistory = alertHistoryRepository.findByIdAndUserId(alertHistoryId, userId)
                .orElseThrow(() -> new BusinessException(AlertErrorCode.ALERT_NOT_FOUND));
        alertHistory.markRead();
        alertHistoryRepository.save(alertHistory);
    }

    @Transactional
    public void deleteNotification(Long userId, Long alertHistoryId) {
        AlertHistory alertHistory = alertHistoryRepository.findByIdAndUserId(alertHistoryId, userId)
                .orElseThrow(() -> new BusinessException(AlertErrorCode.ALERT_NOT_FOUND));
        alertHistoryRepository.delete(alertHistory);
    }
}
