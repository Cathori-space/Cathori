package org.cathori.backend.alert.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공지사항 알림 발송 이력을 나타내는 데이터 모델입니다.
 *
 * 알림이 발송될 때마다 이 이력이 생성되며, 발송 결과(성공/부분 성공/실패)와
 * 재시도 횟수가 기록됩니다. 관리자는 이 데이터를 통해 알림 발송 현황을 파악할 수 있습니다.
 *
 * status 값의 의미:
 *   - SUCCESS        : 대상 사용자 전원에게 알림이 정상 전달됨
 *   - PARTIAL_SUCCESS: 일부 사용자에게만 알림이 전달됨
 *   - FAILED         : 대상 사용자 전원에게 알림 전달이 실패함
 */
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
