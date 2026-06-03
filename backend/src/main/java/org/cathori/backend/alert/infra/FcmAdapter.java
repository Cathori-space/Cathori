package org.cathori.backend.alert.infra;

import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.application.FcmPort;
import org.cathori.backend.alert.application.UserFcmResult;
import org.cathori.backend.alert.application.UserToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class FcmAdapter implements FcmPort {

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
            List<UserFcmResult> results = new ArrayList<>(responses.size());
            for (int i = 0; i < responses.size(); i++) {
                results.add(new UserFcmResult(targets.get(i).userId(), responses.get(i).isSuccessful()));
            }
            return results;
        } catch (FirebaseMessagingException e) {
            throw new RuntimeException("FCM 멀티캐스트 발송 실패", e);
        }
    }
}
