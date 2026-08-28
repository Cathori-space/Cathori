package org.cathori.backend.notification.application.push;

import java.util.List;

public interface PushNotificationPort {

    List<UserPushResult> sendMulticast(List<UserToken> targets, String title, String body, Long noticeId);
}
