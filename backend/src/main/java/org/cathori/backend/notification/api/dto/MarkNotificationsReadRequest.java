package org.cathori.backend.notification.api.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MarkNotificationsReadRequest(
        @NotEmpty(message = "읽음 처리할 알림 ID가 필요합니다")
        @Size(max = 100, message = "한 번에 최대 100개의 알림을 읽음 처리할 수 있습니다")
        List<@NotNull(message = "알림 ID는 null일 수 없습니다") Long> alertHistoryIds
) {
}
