package org.cathori.backend.alert.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.domain.AlertHistory;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;
    private final FcmPort fcmPort;

    public void dispatchAlerts() {
        Set<Long> sentIds = alertHistoryRepository.findAllSentNoticeIds();
        List<Notice> unsentNotices = sentIds.isEmpty()
                ? noticeRepository.findAll()
                : noticeRepository.findUnsentNotices(sentIds);

        if (unsentNotices.isEmpty()) {
            log.info("미발송 공지 없음");
            return;
        }

        log.info("미발송 공지 {}건 발송 시작", unsentNotices.size());
        for (Notice notice : unsentNotices) {
            dispatchForNotice(notice);
        }
    }

    private void dispatchForNotice(Notice notice) {
        List<String> tokens = userRepository.findUsersWithTagMatchingTitle(notice.getTitle())
                .stream()
                .map(User::getDeviceToken)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (tokens.isEmpty()) return;

        try {
            FcmBatchResult result = fcmPort.sendMulticast(tokens, "Cathori 새 공지", notice.getTitle(), notice.getId());
            alertHistoryRepository.save(toAlertHistory(notice.getId(), result));
            log.info("FCM 발송 완료. noticeId={}, success={}, fail={}",
                    notice.getId(), result.successCount(), result.failureCount());
        } catch (Exception e) {
            log.error("FCM 발송 실패. noticeId={}", notice.getId(), e);
            alertHistoryRepository.save(AlertHistory.failed(notice.getId()));
        }
    }

    private AlertHistory toAlertHistory(Long noticeId, FcmBatchResult result) {
        if (result.failureCount() == 0) return AlertHistory.success(noticeId);
        if (result.successCount() > 0) return AlertHistory.partialSuccess(noticeId);
        return AlertHistory.failed(noticeId);
    }

    public void retryFailedAlerts() {
        List<AlertHistory> failedList = alertHistoryRepository.findFailedForRetry();
        if (failedList.isEmpty()) return;

        log.info("FCM 재시도 {}건", failedList.size());
        for (AlertHistory history : failedList) {
            retryAlert(history);
        }
    }

    private void retryAlert(AlertHistory history) {
        Notice notice = noticeRepository.findById(history.getNoticeId()).orElse(null);
        if (notice == null) return;

        List<String> tokens = userRepository.findUsersWithTagMatchingTitle(notice.getTitle())
                .stream()
                .map(User::getDeviceToken)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (tokens.isEmpty()) return;

        try {
            FcmBatchResult result = fcmPort.sendMulticast(tokens, "Cathori 새 공지", notice.getTitle(), notice.getId());
            if (result.failureCount() == 0) {
                history.markSuccess();
            } else {
                history.incrementRetry();
            }
        } catch (Exception e) {
            log.error("FCM 재시도 실패. historyId={}", history.getId(), e);
            history.incrementRetry();
        }

        alertHistoryRepository.save(history);
    }
}
