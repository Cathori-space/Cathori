package org.cathori.backend.notification.api;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.notification.api.dto.NotificationListResponse;
import org.cathori.backend.notification.application.inbox.NotificationService;
import org.cathori.backend.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<NotificationListResponse> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size
    ) {
        NotificationListResponse response = notificationService.listNotifications(
                userDetails.getUserId(), cursor, size);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{alertHistoryId}/read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long alertHistoryId
    ) {
        notificationService.markRead(userDetails.getUserId(), alertHistoryId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{alertHistoryId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long alertHistoryId
    ) {
        notificationService.deleteNotification(userDetails.getUserId(), alertHistoryId);
        return ResponseEntity.noContent().build();
    }

}
