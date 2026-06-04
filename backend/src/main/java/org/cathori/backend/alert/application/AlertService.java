package org.cathori.backend.alert.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cathori.backend.alert.domain.AlertHistory;
import org.cathori.backend.notice.infra.crawler.source.DepartmentSource;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final AlertResultWriter alertResultWriter;
    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;
    private final FcmPort fcmPort;

    public void dispatchAlerts() {
        List<Notice> unsentNotices = noticeRepository.findByAlertDispatchedFalse();
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
        List<UserToken> targets = buildTargets(notice);

        if (targets.isEmpty()) {
            notice.markAlertDispatched();
            noticeRepository.save(notice);
            return;
        }

        // PENDING row 일괄 INSERT
        Map<Long, String> matchedTags = userRepository.findFirstMatchedTagsByTitle(notice.getTitle());
        List<AlertHistory> pendingLogs = targets.stream()
                .map(t -> AlertHistory.create(t.userId(), notice.getId(), matchedTags.get(t.userId())))
                .toList();
        alertHistoryRepository.saveAll(pendingLogs);

        // FCM HTTP 호출 — @Transactional 범위 밖
        List<UserFcmResult> results;
        try {
            results = fcmPort.sendMulticast(targets, "Cathori 새 공지", notice.getTitle(), notice.getId());
        } catch (Exception e) {
            log.error("FCM 발송 실패. noticeId={}", notice.getId(), e);
            List<Long> allUserIds = targets.stream().map(UserToken::userId).toList();
            alertResultWriter.persistDispatchFailure(notice, allUserIds);
            return;
        }

        List<Long> successIds = results.stream().filter(UserFcmResult::success).map(UserFcmResult::userId).toList();
        List<Long> failedIds = results.stream().filter(r -> !r.success()).map(UserFcmResult::userId).toList();
        alertResultWriter.persistDispatchResult(notice, successIds, failedIds);
        log.info("FCM 발송 완료. noticeId={}, success={}, fail={}", notice.getId(), successIds.size(), failedIds.size());
    }

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
            results = fcmPort.sendMulticast(targets, "Cathori 새 공지", notice.getTitle(), noticeId);
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

    private List<UserToken> buildTargets(Notice notice) {
        return userRepository.findUsersWithTagMatchingTitle(notice.getTitle())
                .stream()
                .filter(u -> isEligibleForNotice(u, notice))
                .filter(u -> u.getDeviceToken() != null)
                .map(u -> new UserToken(u.getId(), u.getDeviceToken()))
                .toList();
    }

    private boolean isEligibleForNotice(User user, Notice notice) {
        if ("MAIN".equals(notice.getSourceType())) return true;
        String sourceId = notice.getSourceId();
        String majorCode = DepartmentSource.findEnumNameByDisplayName(user.getMajor());
        if (sourceId.equals(majorCode)) return true;
        String secondMajor = user.getSecondMajor();
        if (secondMajor == null || "전공심화".equals(secondMajor)) return false;
        String secondMajorCode = DepartmentSource.findEnumNameByDisplayName(secondMajor);
        return sourceId.equals(secondMajorCode);
    }
}
