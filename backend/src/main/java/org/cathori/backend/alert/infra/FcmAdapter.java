package org.cathori.backend.alert.infra;

import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.application.FcmBatchResult;
import org.cathori.backend.alert.application.FcmPort;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class FcmAdapter implements FcmPort {

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
