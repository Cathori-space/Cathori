package org.cathori.backend.alert.application;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.alert.domain.AlertHistory;
import org.cathori.backend.alert.infra.AlertHistoryJpaRepository;
import org.cathori.backend.notice.application.CrawledNotice;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.tag.infra.TagJpaRepository;
import org.cathori.backend.tag.domain.Tag;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("AlertService 통합 테스트")
class AlertServiceTest extends IntegrationTestBase {

    @Autowired AlertService alertService;
    @Autowired AlertHistoryJpaRepository alertHistoryJpaRepository;
    @Autowired NoticeRepository noticeRepository;
    @Autowired UserJpaRepository userJpaRepository;
    @Autowired TagJpaRepository tagJpaRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean FcmPort fcmPort;
    @MockitoBean NotificationPort notificationPort;

    @AfterEach
    void cleanup() {
        alertHistoryJpaRepository.deleteAll();
        tagJpaRepository.deleteAll();
        userJpaRepository.deleteAll();
        noticeRepository.deleteAll();
    }

    // --- dispatchAlerts() ---

    @Test
    @DisplayName("DA-1: FCM 전부 성공 시 SUCCESS 이력 저장")
    void dispatchAlerts_allSuccess_savesSuccessHistory() {
        Notice notice = saveNotice("장학금 안내");
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willReturn(new FcmBatchResult(1, 0));

        alertService.dispatchAlerts();

        List<AlertHistory> histories = alertHistoryJpaRepository.findAll();
        assertThat(histories).hasSize(1);
        assertThat(histories.getFirst().getStatus()).isEqualTo("SUCCESS");
        assertThat(histories.getFirst().getNoticeId()).isEqualTo(notice.getId());
    }

    @Test
    @DisplayName("DA-2: FCM 일부 실패 시 PARTIAL_SUCCESS 이력 저장")
    void dispatchAlerts_partialFailure_savesPartialSuccessHistory() {
        saveNotice("장학금 안내");
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willReturn(new FcmBatchResult(1, 1));

        alertService.dispatchAlerts();

        List<AlertHistory> histories = alertHistoryJpaRepository.findAll();
        assertThat(histories).hasSize(1);
        assertThat(histories.getFirst().getStatus()).isEqualTo("PARTIAL_SUCCESS");
    }

    @Test
    @DisplayName("DA-3: FCM 전부 실패 시 FAILED 이력 저장")
    void dispatchAlerts_allFailure_savesFailedHistory() {
        saveNotice("장학금 안내");
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willReturn(new FcmBatchResult(0, 1));

        alertService.dispatchAlerts();

        List<AlertHistory> histories = alertHistoryJpaRepository.findAll();
        assertThat(histories).hasSize(1);
        assertThat(histories.getFirst().getStatus()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("DA-4: 매칭 사용자 없으면 FCM 미호출, 이력 미저장")
    void dispatchAlerts_noMatchingUser_doesNotSendOrSave() {
        saveNotice("장학금 안내");
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "취업");  // 공지 제목과 매칭 안 됨

        alertService.dispatchAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
        assertThat(alertHistoryJpaRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("DA-5: 매칭 사용자 있지만 deviceToken=null이면 FCM 미호출, 이력 미저장")
    void dispatchAlerts_nullDeviceToken_doesNotSendOrSave() {
        saveNotice("장학금 안내");
        User user = saveUserWithoutToken("user1@test.com");
        saveTag(user.getId(), "장학금");

        alertService.dispatchAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
        assertThat(alertHistoryJpaRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("DA-6: 공지 없으면 FCM 미호출")
    void dispatchAlerts_noNotices_doesNotSend() {
        alertService.dispatchAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("DA-7: 모든 공지가 이미 발송됨이면 FCM 미호출")
    void dispatchAlerts_allAlreadySent_doesNotSend() {
        Notice notice = saveNotice("장학금 안내");
        alertHistoryJpaRepository.save(AlertHistory.success(notice.getId()));

        alertService.dispatchAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("DA-8: FCM 발송 중 예외 발생 시 FAILED 이력 저장")
    void dispatchAlerts_fcmException_savesFailedHistory() {
        Notice notice = saveNotice("장학금 안내");
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willThrow(new RuntimeException("FCM 연결 실패"));

        alertService.dispatchAlerts();

        List<AlertHistory> histories = alertHistoryJpaRepository.findAll();
        assertThat(histories).hasSize(1);
        assertThat(histories.getFirst().getStatus()).isEqualTo("FAILED");
        assertThat(histories.getFirst().getNoticeId()).isEqualTo(notice.getId());
    }

    // --- retryFailedAlerts() ---

    @Test
    @DisplayName("RA-1: 재시도 FCM 성공 시 status가 SUCCESS로 변경")
    void retryFailedAlerts_fcmSuccess_updatesStatusToSuccess() {
        Notice notice = saveNotice("장학금 안내");
        AlertHistory failed = alertHistoryJpaRepository.save(AlertHistory.failed(notice.getId()));
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willReturn(new FcmBatchResult(1, 0));

        alertService.retryFailedAlerts();

        AlertHistory updated = alertHistoryJpaRepository.findById(failed.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("RA-2: 재시도 FCM 실패 시 retryCount 증가")
    void retryFailedAlerts_fcmFailure_incrementsRetryCount() {
        Notice notice = saveNotice("장학금 안내");
        AlertHistory failed = alertHistoryJpaRepository.save(AlertHistory.failed(notice.getId()));
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willReturn(new FcmBatchResult(0, 1));

        alertService.retryFailedAlerts();

        AlertHistory updated = alertHistoryJpaRepository.findById(failed.getId()).orElseThrow();
        assertThat(updated.getRetryCount()).isEqualTo(1);
        assertThat(updated.getStatus()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("RA-3: 재시도 중 예외 발생 시 retryCount 증가")
    void retryFailedAlerts_fcmException_incrementsRetryCount() {
        Notice notice = saveNotice("장학금 안내");
        AlertHistory failed = alertHistoryJpaRepository.save(AlertHistory.failed(notice.getId()));
        User user = saveUserWithToken("user1@test.com", "token-abc");
        saveTag(user.getId(), "장학금");
        given(fcmPort.sendMulticast(anyList(), anyString(), anyString(), anyLong()))
                .willThrow(new RuntimeException("FCM 타임아웃"));

        alertService.retryFailedAlerts();

        AlertHistory updated = alertHistoryJpaRepository.findById(failed.getId()).orElseThrow();
        assertThat(updated.getRetryCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("RA-4: 실패 이력의 공지가 DB에 없으면 조용히 스킵")
    void retryFailedAlerts_noticeNotFound_skipsQuietly() {
        alertHistoryJpaRepository.save(AlertHistory.failed(999L));

        alertService.retryFailedAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
        AlertHistory history = alertHistoryJpaRepository.findAll().getFirst();
        assertThat(history.getRetryCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("RA-5: 실패 이력 없으면 FCM 미호출")
    void retryFailedAlerts_noFailedHistory_doesNotSend() {
        alertService.retryFailedAlerts();

        verify(fcmPort, never()).sendMulticast(anyList(), anyString(), anyString(), anyLong());
    }

    // --- 헬퍼 메서드 ---

    private Notice saveNotice(String title) {
        CrawledNotice crawled = CrawledNotice.builder()
                .articleNo("TEST001")
                .sourceType("MAIN")
                .sourceId(null)
                .category("일반")
                .title(title)
                .department("공지사항")
                .postedAt(LocalDate.now().toString())
                .url("https://example.com/notice/1")
                .bodyText("")
                .imageUrls(List.of())
                .build();
        return noticeRepository.save(Notice.from(crawled));
    }

    private User saveUserWithToken(String email, String token) {
        User user = userJpaRepository.save(
                User.create(email, "encodedPwd", "컴퓨터정보공학", null, 2, "재학"));
        jdbcTemplate.update("UPDATE users SET device_token = ? WHERE id = ?", token, user.getId());
        return user;
    }

    private User saveUserWithoutToken(String email) {
        return userJpaRepository.save(
                User.create(email, "encodedPwd", "컴퓨터정보공학", null, 2, "재학"));
    }

    private void saveTag(Long userId, String tagName) {
        tagJpaRepository.save(Tag.create(userId, tagName));
    }
}
