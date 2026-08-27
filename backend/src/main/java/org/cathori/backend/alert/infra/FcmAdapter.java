package org.cathori.backend.alert.infra;

import java.util.ArrayList;
import java.util.List;

import org.cathori.backend.alert.application.push.PushNotificationPort;
import org.cathori.backend.alert.application.push.UserFcmResult;
import org.cathori.backend.alert.application.push.UserToken;
import org.springframework.stereotype.Component;

import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class FcmAdapter implements PushNotificationPort {

    @Override
    public List<UserFcmResult> sendMulticast(List<UserToken> targets, String title, String body, Long noticeId) {
        List<String> tokens = targets.stream().map(UserToken::token).toList();

        MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putData("noticeId", String.valueOf(noticeId))
                .build();

        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            List<SendResponse> responses = response.getResponses();
            log.info("FCM 멀티캐스트 응답. 전체={}, 성공={}, 실패={}",
                    responses.size(), response.getSuccessCount(), response.getFailureCount());

            List<UserFcmResult> results = new ArrayList<>(responses.size());
            for (int i = 0; i < responses.size(); i++) {
                SendResponse sr = responses.get(i);
                if (!sr.isSuccessful()) {
                    // 배치는 200 OK여도 개별 토큰은 조용히 거부될 수 있음
                    // (UNREGISTERED / SENDER_ID_MISMATCH / INVALID_ARGUMENT 등).
                    // 미수신 디버깅의 핵심 단서이므로 토큰별 사유를 반드시 남긴다.
                    FirebaseMessagingException ex = sr.getException();
                    log.error("FCM 토큰 거부. userId={}, code={}, msg={}",
                                targets.get(i).userId(),
                                ex != null ? ex.getMessagingErrorCode() : "UNKNOWN",
                                ex != null ? ex.getMessage() : "no exception detail",
                                ex);  // ← 마지막에 ex 추가
                }
                results.add(new UserFcmResult(targets.get(i).userId(), sr.isSuccessful()));
            }
            return results;
        } catch (FirebaseMessagingException e) {
            log.error("FCM 멀티캐스트 호출 자체가 실패. code={}",
                e.getMessagingErrorCode(), e);
            throw new RuntimeException("FCM 멀티캐스트 발송 실패", e);
        }
    }
}
