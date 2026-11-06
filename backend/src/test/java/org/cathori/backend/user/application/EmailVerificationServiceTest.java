package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.common.exception.RateLimitedException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.EmailSendLimitPolicy;
import org.cathori.backend.user.application.email.SendRateLimiter;
import org.cathori.backend.user.application.email.VerificationCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.domain.UserRepository;
import org.cathori.backend.user.infra.email.CaffeineSendRateLimiter;
import org.cathori.backend.user.infra.email.CaffeineVerificationCodeStore;
import org.cathori.backend.user.infra.email.CaffeineVerifiedEmailStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.cathori.backend.user.application.email.VerificationPurpose.PASSWORD_RESET;
import static org.cathori.backend.user.application.email.VerificationPurpose.SIGNUP;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@DisplayName("EmailVerificationService 목적(purpose) 분리 · 가입 도메인 제한 · 발송 제한 · 번호 재사용 · 입력 제한")
class EmailVerificationServiceTest {

    private static final String EMAIL = "student@catholic.ac.kr";
    private static final String GMAIL = "someone@gmail.com";
    private static final EmailDomainPolicy SCHOOL_ONLY =
            new EmailDomainPolicy(List.of("catholic.ac.kr"), List.of());

    private VerificationCodeStore codeStore;
    private VerifiedEmailStore verifiedStore;
    private SendRateLimiter sendRateLimiter;
    private NotificationPort notificationPort;
    private UserRepository userRepository;
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        Duration ttl = Duration.ofMinutes(3);
        codeStore = new CaffeineVerificationCodeStore(ttl);
        verifiedStore = new CaffeineVerifiedEmailStore(Duration.ofMinutes(30));
        notificationPort = mock(NotificationPort.class);
        userRepository = mock(UserRepository.class);
        sendRateLimiter = new CaffeineSendRateLimiter(Duration.ofHours(1));
        service = new EmailVerificationService(codeStore, verifiedStore, notificationPort, SCHOOL_ONLY,
                new EmailSendLimitPolicy(sendRateLimiter, 3, 10), userRepository, ttl);
    }

    /** 발송된 메일에 실린 인증번호를 꺼낸다. */
    private String sentCode(VerificationPurpose purpose, String email) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(notificationPort).sendVerificationCode(eq(purpose), eq(email), code.capture());
        return code.getValue();
    }

    @Test
    @DisplayName("SIGNUP으로 받은 번호로는 PASSWORD_RESET 인증이 되지 않는다")
    void signupCodeCannotVerifyPasswordReset() {
        // given
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(PASSWORD_RESET, EMAIL, code));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("PASSWORD_RESET 인증은 SIGNUP 인증 상태를 만들지 않는다")
    void passwordResetVerificationDoesNotMarkSignup() {
        // given
        service.sendCode(PASSWORD_RESET, EMAIL);
        String code = sentCode(PASSWORD_RESET, EMAIL);

        // when
        service.verifyCode(PASSWORD_RESET, EMAIL, code);

        // then
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, EMAIL)).isTrue();
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("틀린 번호는 실패를 누적하되 만료 시각을 바꾸지 않고, 맞는 번호는 여전히 통과한다")
    void wrongCodeAccumulatesFailureWithoutExtendingExpiry() {
        // given
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);
        VerificationCode before = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        String wrong = code.equals("000000") ? "111111" : "000000";

        // when — 한 번 틀린다
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, EMAIL, wrong));

        // then — 실패만 누적, 만료 시각 유지
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_INVALID_VERIFY_CODE);
        VerificationCode after = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        assertThat(after.failedAttempts()).isEqualTo(1);
        assertThat(after.expiresAt()).isEqualTo(before.expiresAt());

        // when — 이어서 맞는 번호를 넣는다
        service.verifyCode(SIGNUP, EMAIL, code);

        // then — 인증 완료, 쓴 번호는 재사용 불가
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isTrue();
        assertThat(codeStore.find(SIGNUP, EMAIL)).isEmpty();
    }

    @Test
    @DisplayName("SIGNUP 발송 — 비학교 도메인이면 메일을 보내지 않고 거부한다")
    void signupSendRejectsNonSchoolDomain() {
        // given — 비학교 도메인 주소 (GMAIL)

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.sendCode(SIGNUP, GMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        verify(notificationPort, never()).sendVerificationCode(any(), anyString(), anyString());
        assertThat(codeStore.find(SIGNUP, GMAIL)).isEmpty();
    }

    @Test
    @DisplayName("SIGNUP 확인 — 비학교 도메인이면 거부한다")
    void signupVerifyRejectsNonSchoolDomain() {
        // given — 비학교 도메인 주소 (GMAIL)

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, GMAIL, "000000"));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DOMAIN_NOT_ALLOWED);
        assertThat(verifiedStore.isVerified(SIGNUP, GMAIL)).isFalse();
    }

    @Test
    @DisplayName("PASSWORD_RESET — 비학교 도메인도 발송·인증된다 (기존 회원 복구 경로, ADR D1)")
    void passwordResetIgnoresDomainPolicy() {
        // given
        service.sendCode(PASSWORD_RESET, GMAIL);
        String code = sentCode(PASSWORD_RESET, GMAIL);

        // when
        service.verifyCode(PASSWORD_RESET, GMAIL, code);

        // then
        assertThat(verifiedStore.isVerified(PASSWORD_RESET, GMAIL)).isTrue();
    }

    /** 지금까지 발송된 메일에 실린 인증번호를 순서대로 꺼낸다. */
    private List<String> sentCodes(VerificationPurpose purpose, String email, int times) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(notificationPort, times(times)).sendVerificationCode(eq(purpose), eq(email), code.capture());
        return code.getAllValues();
    }

    @Test
    @DisplayName("유효한 번호가 있으면 재발송해도 같은 번호를 보내고, 만료 시각·실패 횟수를 초기화하지 않는다")
    void resendReusesValidCodeWithoutReset() {
        // given — 발송 후 한 번 틀렸다
        service.sendCode(SIGNUP, EMAIL);
        String first = sentCode(SIGNUP, EMAIL);
        String wrong = first.equals("000000") ? "111111" : "000000";
        catchThrowable(() -> service.verifyCode(SIGNUP, EMAIL, wrong));
        VerificationCode before = codeStore.find(SIGNUP, EMAIL).orElseThrow();

        // when
        service.sendCode(SIGNUP, EMAIL);

        // then — 두 메일의 번호가 같고, 저장된 값은 그대로다
        assertThat(sentCodes(SIGNUP, EMAIL, 2)).containsOnly(first);
        assertThat(codeStore.find(SIGNUP, EMAIL)).contains(before);
        assertThat(before.failedAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("만료된 번호는 재사용하지 않고 새 번호를 발급한다")
    void resendIssuesNewCodeWhenExpired() {
        // given — 이미 만료된 번호가 남아 있다
        Instant past = Instant.now().minusSeconds(1);
        codeStore.save(SIGNUP, EMAIL, new VerificationCode("123456", past, 2));

        // when
        service.sendCode(SIGNUP, EMAIL);

        // then — 실패 횟수 0, 만료 시각이 새로 잡힌 번호
        VerificationCode issued = codeStore.find(SIGNUP, EMAIL).orElseThrow();
        assertThat(issued.failedAttempts()).isZero();
        assertThat(issued.expiresAt()).isAfter(Instant.now());
        assertThat(sentCode(SIGNUP, EMAIL)).isEqualTo(issued.code());
    }

    @Test
    @DisplayName("발송 제한은 purpose와 무관하게 이메일 단위로 센다 — 막힌 요청은 메일도, 기록도 남기지 않는다")
    void sendLimitIsSharedAcrossPurposes() {
        // given — SIGNUP 2번 + PASSWORD_RESET 1번
        service.sendCode(SIGNUP, EMAIL);
        service.sendCode(SIGNUP, EMAIL);
        service.sendCode(PASSWORD_RESET, EMAIL);

        // when — 1분 안의 4번째
        RateLimitedException e = catchThrowableOfType(RateLimitedException.class,
                () -> service.sendCode(SIGNUP, EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_TOO_FREQUENT);
        verify(notificationPort, times(2)).sendVerificationCode(eq(SIGNUP), eq(EMAIL), anyString());
        assertThat(sendRateLimiter.countWithin(EMAIL, Duration.ofMinutes(1))).isEqualTo(3);
    }

    @Test
    @DisplayName("메일 발송에 실패하면 발송 횟수에 넣지 않는다")
    void failedSendIsNotRecorded() {
        // given
        doThrow(new IllegalStateException("smtp down"))
                .when(notificationPort).sendVerificationCode(any(), anyString(), anyString());

        // when
        Throwable thrown = catchThrowable(() -> service.sendCode(SIGNUP, EMAIL));

        // then
        assertThat(thrown).isInstanceOf(IllegalStateException.class);
        assertThat(sendRateLimiter.countWithin(EMAIL, Duration.ofHours(1))).isZero();
    }

    /** 발급된 번호와 반드시 다른 6자리. */
    private static String wrongOf(String code) {
        return code.equals("000000") ? "111111" : "000000";
    }

    @Test
    @DisplayName("4번째 실패까지는 USER_INVALID_VERIFY_CODE, 5번째 실패는 USER_VERIFY_ATTEMPTS_EXCEEDED + 번호 삭제")
    void fifthFailureDeletesCode() {
        // given — 4번 틀렸다
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);
        for (int i = 0; i < VerificationCode.MAX_FAILED_ATTEMPTS - 1; i++) {
            BusinessException e = catchThrowableOfType(BusinessException.class,
                    () -> service.verifyCode(SIGNUP, EMAIL, wrongOf(code)));
            assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_INVALID_VERIFY_CODE);
        }

        // when — 5번째도 틀린다
        BusinessException fifth = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, EMAIL, wrongOf(code)));

        // then
        assertThat(fifth.getErrorCode()).isEqualTo(UserErrorCode.USER_VERIFY_ATTEMPTS_EXCEEDED);
        assertThat(codeStore.find(SIGNUP, EMAIL)).isEmpty();
    }

    @Test
    @DisplayName("5번 틀린 뒤에는 맞는 번호를 넣어도 인증되지 않는다 (ADR §7)")
    void correctCodeAfterExhaustionFails() {
        // given — 5번 틀려 번호가 지워졌다
        service.sendCode(SIGNUP, EMAIL);
        String code = sentCode(SIGNUP, EMAIL);
        for (int i = 0; i < VerificationCode.MAX_FAILED_ATTEMPTS; i++) {
            catchThrowable(() -> service.verifyCode(SIGNUP, EMAIL, wrongOf(code)));
        }

        // when — 6번째에 맞는 번호
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.verifyCode(SIGNUP, EMAIL, code));

        // then — 남은 번호가 없으므로 다시 받아야 한다
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        assertThat(verifiedStore.isVerified(SIGNUP, EMAIL)).isFalse();
    }

    @Test
    @DisplayName("동시에 들어온 오답 20건도 정확히 5번만 비교된다 — 실패 누적이 서로 덮어쓰지 않는다")
    void concurrentWrongAttemptsAreCountedExactly() throws Exception {
        // given
        service.sendCode(SIGNUP, EMAIL);
        String wrong = wrongOf(sentCode(SIGNUP, EMAIL));
        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        Map<UserErrorCode, AtomicInteger> outcomes = new ConcurrentHashMap<>();

        // when — 20건을 한꺼번에 출발시킨다
        try {
            for (int i = 0; i < threads; i++) {
                pool.submit(() -> {
                    start.await();
                    BusinessException e = catchThrowableOfType(BusinessException.class,
                            () -> service.verifyCode(SIGNUP, EMAIL, wrong));
                    outcomes.computeIfAbsent((UserErrorCode) e.getErrorCode(), k -> new AtomicInteger())
                            .incrementAndGet();
                    return null;
                });
            }
            start.countDown();
            pool.shutdown();
            assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        } finally {
            pool.shutdownNow();
        }

        // then — 4번 오답, 1번 한도 초과, 나머지는 번호 없음
        assertThat(outcomes.get(UserErrorCode.USER_INVALID_VERIFY_CODE)).hasValue(4);
        assertThat(outcomes.get(UserErrorCode.USER_VERIFY_ATTEMPTS_EXCEEDED)).hasValue(1);
        assertThat(outcomes.get(UserErrorCode.USER_VERIFY_CODE_EXPIRED)).hasValue(threads - 5);
    }

    @Test
    @DisplayName("SIGNUP — 이미 가입된 이메일이면 메일을 보내지 않고 409, 발송 횟수에도 넣지 않는다 (ADR D6)")
    void signupSendRejectsRegisteredEmail() {
        // given
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> service.sendCode(SIGNUP, EMAIL));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.USER_EMAIL_DUPLICATE);
        verify(notificationPort, never()).sendVerificationCode(any(), anyString(), anyString());
        assertThat(sendRateLimiter.countWithin(EMAIL, Duration.ofHours(1))).isZero();
    }
}
