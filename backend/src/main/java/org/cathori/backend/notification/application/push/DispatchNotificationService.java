package org.cathori.backend.notification.application.push;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.cathori.backend.notification.domain.AlertHistory;
import org.cathori.backend.notification.domain.AlertHistoryRepository;
import org.cathori.backend.notice.infra.crawler.source.DepartmentSource;
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
public class DispatchNotificationService {

    private final AlertHistoryRepository alertHistoryRepository;
    private final AlertResultWriter alertResultWriter;
    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;
    private final PushNotificationPort pushNotificationPort;

    public void dispatchAlerts() {
        List<Notice> unsentNotices = noticeRepository.findByAlertDispatchedFalse();
        if (unsentNotices.isEmpty()) {
            log.info("미발송 공지 없음");
            return;
        }
        log.info("미발송 공지 {}건 발송 시작", unsentNotices.size());
        for (Notice notice : unsentNotices) {
            log.info("공지id {} 제목 {} 발송 시작", notice.getId(), notice.getTitle());
            dispatchForNotice(notice);
        }
    }

    private void dispatchForNotice(Notice notice) {
        List<UserToken> targets = buildTargets(notice);
        log.info("noticeId={} 발송 대상 {}명", notice.getId(), targets.size());

        if (targets.isEmpty()) {
            notice.markAlertDispatched();
            noticeRepository.save(notice);
            return;
        }
        // (user_id, notice_id)는 유니크 제약이므로, 이미 이력이 있는 사용자에게는 새 PENDING row를 INSERT X
        // 발송 자체는 전체 대상에게 하고, 기존 row는 persistDispatchResult의 UPDATE로 갱신된다.

        // 1. 일단 AlertHistory에 저장된 user_id를 가져옴
        Set<Long> alreadyLogged = new HashSet<>(alertHistoryRepository.findUserIdsByNoticeId(notice.getId()));

        // 2. AlertHistory에 저장된 user_id를 제외한 나머지 user_id에 대해서만 AlertHistory를 생성
        Map<Long, String> matchedTags = userRepository.findFirstMatchedTagsByTitle(notice.getTitle());
        List<AlertHistory> pendingLogs = targets.stream()
                .filter(t -> !alreadyLogged.contains(t.userId()))
                .map(t -> AlertHistory.create(t.userId(), notice.getId(), matchedTags.get(t.userId())))
                .toList();

        // 3. 기존 AlertHistory에 없을 경우 PENDING 로그를 추가
        if (!pendingLogs.isEmpty()) {
            alertHistoryRepository.saveAll(pendingLogs);
        }

        // 4. @Transactional 범위 밖에서 FCM HTTP 호출
        List<UserFcmResult> results;
        try {
            results = pushNotificationPort.sendMulticast(targets, "Cathori 새 공지", notice.getTitle(), notice.getId());
        } catch (Exception e) {
            log.error("FCM 발송 실패. noticeId={}", notice.getId(), e);
            List<Long> allUserIds = targets.stream().map(UserToken::userId).toList();

            // 여기서 발송 실패는 UPDATE 라서 괜찮음
            alertResultWriter.persistDispatchFailure(notice, allUserIds);
            return;
        }

        // FCM예외와 무관하게 성공 실패는 한 번에 기록
        List<Long> successIds = results.stream().filter(UserFcmResult::success).map(UserFcmResult::userId).toList();
        List<Long> failedIds = results.stream().filter(r -> !r.success()).map(UserFcmResult::userId).toList();
        alertResultWriter.persistDispatchResult(notice, successIds, failedIds);
        
        log.info("FCM 발송 완료. noticeId={}, success={}, fail={}", notice.getId(), successIds.size(), failedIds.size());
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
