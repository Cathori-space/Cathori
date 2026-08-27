package org.cathori.backend.notification.application.push;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.cathori.backend.notification.domain.AlertHistory;
import org.cathori.backend.notification.domain.AlertHistoryRepository;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RetryDispatchNotificationService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final AlertResultWriter alertResultWriter;
    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;
    private final PushNotificationPort pushNotificationPort;

    public void retryFailedAlerts() {
        List<AlertHistory> failedLogs = alertHistoryRepository.findFailedForRetry();
        if (failedLogs.isEmpty()) return;

        log.info("FCM 재시도 {}건", failedLogs.size());

        Map<Long, List<AlertHistory>> byNotice = failedLogs.stream()
                .collect(Collectors.groupingBy(AlertHistory::getNoticeId));

        for (Map.Entry<Long, List<AlertHistory>> entry : byNotice.entrySet()) {
            retryForNotice(entry.getKey(), entry.getValue());
        }
    }

    private void retryForNotice(Long noticeId, List<AlertHistory> logs) {
        Notice notice = noticeRepository.findById(noticeId).orElse(null);
        if (notice == null) return;

        List<UserToken> targets = logs.stream()
                .map(l -> {
                    User user = userRepository.findById(l.getUserId()).orElse(null);
                    if (user == null || user.getDeviceToken() == null) return null;
                    return new UserToken(l.getUserId(), user.getDeviceToken());
                })
                .filter(Objects::nonNull)
                .toList();

        if (targets.isEmpty()) return;

        List<UserFcmResult> results;
        try {
            results = pushNotificationPort.sendMulticast(targets, "Cathori 새 공지", notice.getTitle(), noticeId);
        } catch (Exception e) {
            log.error("FCM 재시도 실패. noticeId={}", noticeId, e);
            List<Long> userIds = targets.stream().map(UserToken::userId).toList();
            alertResultWriter.persistRetryFailure(noticeId, userIds);
            return;
        }

        List<Long> successIds = results.stream().filter(UserFcmResult::success).map(UserFcmResult::userId).toList();
        List<Long> failedIds = results.stream().filter(r -> !r.success()).map(UserFcmResult::userId).toList();
        alertResultWriter.persistRetryResult(noticeId, successIds, failedIds);
    }
}
