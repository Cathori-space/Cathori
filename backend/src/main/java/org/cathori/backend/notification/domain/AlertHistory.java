package org.cathori.backend.notification.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "alert_history",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "notice_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlertHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(name = "alarm_status", nullable = false, length = 10)
    private String alarmStatus;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "matched_tag", length = 20)
    private String matchedTag;

    public static AlertHistory create(Long userId, Long noticeId, String matchedTag) {
        AlertHistory h = new AlertHistory();
        h.userId = userId;
        h.noticeId = noticeId;
        h.alarmStatus = "PENDING";
        h.isRead = false;
        h.retryCount = 0;
        h.createdAt = LocalDateTime.now();
        h.matchedTag = matchedTag;
        return h;
    }

    public void markRead() {
        this.isRead = true;
    }

    public void markSuccess() {
        this.alarmStatus = "SUCCESS";
    }

    public void markFailed() {
        this.alarmStatus = "FAILED";
    }

    public void incrementRetry() {
        this.retryCount++;
    }
}
