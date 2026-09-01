package org.cathori.backend.notification.application.push;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.notification.domain.AlertHistoryRepository;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationResultWriter {

    private final AlertHistoryRepository alertHistoryRepository;
    private final NoticeRepository noticeRepository;

    @Transactional
    public void persistDispatchResult(Notice notice, List<Long> successIds, List<Long> failedIds) {
        alertHistoryRepository.markSuccessForUsers(notice.getId(), successIds);
        alertHistoryRepository.markFailedForUsers(notice.getId(), failedIds);
        notice.markAlertDispatched();
        noticeRepository.save(notice);
    }

    @Transactional
    public void persistDispatchFailure(Notice notice, List<Long> allUserIds) {
        alertHistoryRepository.markFailedForUsers(notice.getId(), allUserIds);
        notice.markAlertDispatched();
        noticeRepository.save(notice);
    }

    @Transactional
    public void persistRetryResult(Long noticeId, List<Long> successIds, List<Long> failedIds) {
        alertHistoryRepository.markSuccessForUsers(noticeId, successIds);
        alertHistoryRepository.incrementRetryForUsers(noticeId, failedIds);
    }

    @Transactional
    public void persistRetryFailure(Long noticeId, List<Long> userIds) {
        alertHistoryRepository.incrementRetryForUsers(noticeId, userIds);
    }
}
