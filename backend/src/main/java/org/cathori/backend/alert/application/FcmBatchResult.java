package org.cathori.backend.alert.application;

/**
 * FCM 일괄 발송 결과를 담는 데이터 객체입니다.
 *
 * @param successCount 정상적으로 기기에 전달된 알림 수
 * @param failureCount 전달에 실패한 알림 수 (기기 토큰 만료, 네트워크 오류 등)
 */
public record FcmBatchResult(int successCount, int failureCount) {
}
