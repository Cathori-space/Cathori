package org.cathori.backend.alert.application;

import java.util.List;

public interface FcmPort {

    List<UserFcmResult> sendMulticast(List<UserToken> targets, String title, String body, Long noticeId);
}
