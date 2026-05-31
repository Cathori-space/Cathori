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
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 공지사항 푸시 알림 발송을 담당하는 서비스입니다.
 *
 * 주요 역할:
 *   1. 아직 알림을 보내지 않은 새 공지를 찾아 관심 태그가 일치하는 사용자에게 앱 푸시 알림을 보냅니다.
 *   2. 발송에 실패한 알림을 주기적으로 재시도합니다. (최대 3회)
 *   3. 모든 발송 시도의 결과(성공 / 부분 성공 / 실패)를 이력으로 기록합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;
    private final FcmPort fcmPort;

    /**
     * 새 공지에 대한 푸시 알림을 일괄 발송합니다.
     *
     * 동작 순서:
     *   1. 이미 알림을 보낸 공지 목록을 조회합니다.
     *   2. 아직 한 번도 알림을 보내지 않은 공지만 추려냅니다.
     *   3. 각 공지의 제목과 일치하는 태그를 등록한 사용자에게 푸시 알림을 발송합니다.
     *
     * 이 메서드는 스케줄러에 의해 주기적으로 자동 실행됩니다.
     */
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

    /**
     * 공지 하나에 대해 알림 수신 대상자를 추려 푸시 알림을 발송하고 결과를 저장합니다.
     *
     * - 공지 제목의 키워드와 일치하는 태그를 등록한 사용자만 발송 대상이 됩니다.
     * - 기기 토큰이 없는 사용자(앱 미설치 또는 알림 비허용)는 발송 대상에서 제외됩니다.
     * - 발송 도중 오류가 발생해도 다른 공지의 발송에는 영향을 주지 않습니다.
     */
    private void dispatchForNotice(Notice notice) {
        List<String> tokens = userRepository.findUsersWithTagMatchingTitle(notice.getTitle())
                .stream()
                .filter(u -> isEligibleForNotice(u, notice))
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

    /**
     * 발송 결과를 이력 상태로 변환합니다.
     *
     * - 전원 수신 성공  → SUCCESS (성공)
     * - 일부만 수신 성공 → PARTIAL_SUCCESS (부분 성공)
     * - 전원 수신 실패  → FAILED (실패)
     */
    private AlertHistory toAlertHistory(Long noticeId, FcmBatchResult result) {
        if (result.failureCount() == 0) return AlertHistory.success(noticeId);
        if (result.successCount() > 0) return AlertHistory.partialSuccess(noticeId);
        return AlertHistory.failed(noticeId);
    }

    /**
     * 이전에 실패한 알림 발송을 재시도합니다.
     *
     * - FAILED 상태이고 재시도 횟수가 3회 미만인 이력만 대상으로 합니다.
     * - 재시도에 성공하면 해당 이력의 상태가 SUCCESS로 변경됩니다.
     * - 재시도에도 실패하면 재시도 횟수가 1 증가하며, 3회 소진 시 더 이상 재시도하지 않습니다.
     *
     * 이 메서드는 스케줄러에 의해 주기적으로 자동 실행됩니다.
     */
    public void retryFailedAlerts() {
        List<AlertHistory> failedList = alertHistoryRepository.findFailedForRetry();
        if (failedList.isEmpty()) return;

        log.info("FCM 재시도 {}건", failedList.size());
        for (AlertHistory history : failedList) {
            retryAlert(history);
        }
    }

    /**
     * MAIN 공지는 전체 허용, DEPARTMENT 공지는 사용자의 제1·제2전공과 source_id가 일치하는 경우만 허용합니다.
     */
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

    /**
     * 실패 이력 하나에 대해 알림 재발송을 시도하고 결과를 갱신합니다.
     *
     * - 원본 공지가 삭제된 경우에는 재시도 없이 조용히 건너뜁니다.
     * - 재발송 성공 여부에 따라 이력 상태 또는 재시도 횟수가 업데이트됩니다.
     */
    private void retryAlert(AlertHistory history) {
        Notice notice = noticeRepository.findById(history.getNoticeId()).orElse(null);
        if (notice == null) return;

        List<String> tokens = userRepository.findUsersWithTagMatchingTitle(notice.getTitle())
                .stream()
                .filter(u -> isEligibleForNotice(u, notice))
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
