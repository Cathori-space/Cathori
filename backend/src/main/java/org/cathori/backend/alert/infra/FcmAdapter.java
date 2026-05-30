package org.cathori.backend.alert.infra;

import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.application.FcmBatchResult;
import org.cathori.backend.alert.application.FcmPort;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Google FCM 서버와 실제로 통신하여 푸시 알림을 발송하는 구현체입니다.
 *
 * 여러 사용자에게 동시에 알림을 보내는 멀티캐스트 방식을 사용하며,
 * 알림 본문과 함께 공지사항 ID를 앱에 전달하여 상세 화면으로 이동할 수 있도록 합니다.
 */
@Slf4j
@Component
public class FcmAdapter implements FcmPort {

    /**
     * 여러 사용자 기기에 동시에 푸시 알림을 발송합니다.
     *
     * FCM 서버 오류 발생 시 예외를 던져 AlertService가 실패 이력을 기록하도록 합니다.
     */
    @Override
    public FcmBatchResult sendMulticast(List<String> deviceTokens, String title, String body, Long noticeId) {
        MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(deviceTokens)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putData("noticeId", String.valueOf(noticeId))
                .build();
        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            return new FcmBatchResult(response.getSuccessCount(), response.getFailureCount());
        } catch (FirebaseMessagingException e) {
            throw new RuntimeException("FCM 멀티캐스트 발송 실패", e);
        }
    }
}
