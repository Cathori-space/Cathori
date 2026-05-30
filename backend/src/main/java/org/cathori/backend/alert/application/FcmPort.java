package org.cathori.backend.alert.application;

import java.util.List;

public interface FcmPort {
    FcmBatchResult sendMulticast(List<String> deviceTokens, String title, String body, Long noticeId);
}
