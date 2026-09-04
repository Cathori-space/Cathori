package org.cathori.backend.notification.application.push;

import java.util.List;

public interface PushNotificationPort {

    List<UserPushResult> send(List<UserToken> recipients, String title, String body, Long noticeId);
}
