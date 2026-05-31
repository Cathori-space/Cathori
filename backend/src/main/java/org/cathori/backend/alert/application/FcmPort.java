package org.cathori.backend.alert.application;

import java.util.List;

/**
 * 앱 푸시 알림(FCM) 발송 기능의 명세입니다.
 *
 * FCM(Firebase Cloud Messaging)은 앱이 설치된 사용자의 기기에 알림을 전송하는 서비스입니다.
 * 실제 FCM 통신은 FcmAdapter가 담당하며, 이 인터페이스는 그 기능을 추상화합니다.
 */
public interface FcmPort {

    /**
     * 여러 사용자에게 동시에 푸시 알림을 발송합니다.
     *
     * @param deviceTokens 알림을 받을 사용자 기기 토큰 목록 (앱 설치 시 발급되는 고유 식별자)
     * @param title        알림 제목
     * @param body         알림 본문 (공지 제목)
     * @param noticeId     해당 공지사항 ID (앱에서 공지 상세 화면으로 이동 시 사용)
     * @return             성공/실패 건수를 담은 발송 결과
     */
    FcmBatchResult sendMulticast(List<String> deviceTokens, String title, String body, Long noticeId);
}
