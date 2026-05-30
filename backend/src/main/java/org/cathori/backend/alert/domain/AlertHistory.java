package org.cathori.backend.alert.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "alert_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlertHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static AlertHistory success(Long noticeId) {
        return create(noticeId, "SUCCESS");
    }

    public static AlertHistory partialSuccess(Long noticeId) {
        return create(noticeId, "PARTIAL_SUCCESS");
    }

    public static AlertHistory failed(Long noticeId) {
        return create(noticeId, "FAILED");
    }

    private static AlertHistory create(Long noticeId, String status) {
        AlertHistory history = new AlertHistory();
        history.noticeId = noticeId;
        history.status = status;
        history.retryCount = 0;
        history.createdAt = LocalDateTime.now();
        history.updatedAt = LocalDateTime.now();
        return history;
    }

    public void markSuccess() {
        this.status = "SUCCESS";
        this.updatedAt = LocalDateTime.now();
    }

    public void incrementRetry() {
        this.retryCount++;
        this.updatedAt = LocalDateTime.now();
    }
}
