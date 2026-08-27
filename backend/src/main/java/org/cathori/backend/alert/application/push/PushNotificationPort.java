package org.cathori.backend.alert.application.push;

import java.util.List;

public interface PushNotificationPort {

    List<UserFcmResult> sendMulticast(List<UserToken> targets, String title, String body, Long noticeId);
}
