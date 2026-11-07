package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.EmailSendLimitPolicy;
import org.cathori.backend.user.application.email.VerificationCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final VerificationCodeStore verificationCodeStore;
    private final VerifiedEmailStore verifiedEmailStore;
    private final NotificationPort notificationPort;
    private final EmailDomainPolicy emailDomainPolicy;
    private final EmailSendLimitPolicy emailSendLimitPolicy;
    private final UserRepository userRepository;
    private final Duration codeTtl;

    public EmailVerificationService(VerificationCodeStore verificationCodeStore,
                                    VerifiedEmailStore verifiedEmailStore,
                                    NotificationPort notificationPort,
                                    EmailDomainPolicy emailDomainPolicy,
                                    EmailSendLimitPolicy emailSendLimitPolicy,
                                    UserRepository userRepository,
                                    @Value("${auth.email.code-ttl:PT10M}") Duration codeTtl) {
        this.verificationCodeStore = verificationCodeStore;
        this.verifiedEmailStore = verifiedEmailStore;
        this.notificationPort = notificationPort;
        this.emailDomainPolicy = emailDomainPolicy;
        this.emailSendLimitPolicy = emailSendLimitPolicy;
        this.userRepository = userRepository;
        this.codeTtl = codeTtl;
    }

    public void sendCode(VerificationPurpose purpose, String email) {
        emailDomainPolicy.requireAllowed(purpose, email);
        // 이미 가입된 이메일이면 메일 없이 409 (ADR D6). 보내지 않았으므로 발송 횟수에도 넣지 않는다.
        if (purpose == VerificationPurpose.SIGNUP && userRepository.existsByEmail(email)) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_DUPLICATE);
        }
        emailSendLimitPolicy.requireSendable(email);

        String code = issueNewCode(purpose, email);
        notificationPort.sendVerificationCode(purpose, email, code);
        emailSendLimitPolicy.recordSent(email);
    }

    /**
     * 재발송마다 새 번호를 발급해 덮어쓴다 — 이전 번호는 그 순간 무효다 (ADR D2).
     * 번호마다 실패 횟수는 0부터 다시 세지만, 발송 제한(1시간 10회)이 시도 총량을 묶는다.
     * 발송 전에 저장하므로 메일 발송이 실패해도 이전 번호는 이미 무효다 — 재발송으로 복구된다.
     */
    private String issueNewCode(VerificationPurpose purpose, String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        verificationCodeStore.save(purpose, email, VerificationCode.issue(code, Instant.now(), codeTtl));
        return code;
    }

    public void verifyCode(VerificationPurpose purpose, String email, String code) {
        emailDomainPolicy.requireAllowed(purpose, email);

        // 만료 판정·비교·실패 누적·삭제를 한 번의 원자적 갱신으로 처리한다 — 나누면 동시에 온 오답이 실패 횟수를 덮어쓴다 (ADR D3).
        AtomicReference<Attempt> attempt = new AtomicReference<>(Attempt.NO_CODE);
        Instant now = Instant.now();
        verificationCodeStore.computeIfPresent(purpose, email, current -> {
            // 만료는 캐시 TTL이 아니라 expiresAt으로 본다 (실패 누적으로 다시 쓰면 캐시 TTL은 리셋된다).
            if (current.isExpired(now)) {
                attempt.set(Attempt.NO_CODE);
                return null;
            }
            if (current.matches(code)) {
                attempt.set(Attempt.MATCHED);
                return null; // 쓴 번호는 바로 지운다
            }
            VerificationCode failed = current.withFailure();
            if (failed.failedAttempts() >= VerificationCode.MAX_FAILED_ATTEMPTS) {
                attempt.set(Attempt.EXHAUSTED);
                return null; // 5번째 실패 — 번호를 지워 재발송을 받게 한다
            }
            attempt.set(Attempt.MISMATCHED);
            return failed;
        });

        switch (attempt.get()) {
            case MATCHED -> verifiedEmailStore.markVerified(purpose, email);
            case MISMATCHED -> throw new BusinessException(UserErrorCode.USER_INVALID_VERIFY_CODE);
            case EXHAUSTED -> throw new BusinessException(UserErrorCode.USER_VERIFY_ATTEMPTS_EXCEEDED);
            case NO_CODE -> throw new BusinessException(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        }
    }

    /** 인증 시도 한 번의 결과. 저장소의 원자적 갱신 안에서 정해진다. */
    private enum Attempt { MATCHED, MISMATCHED, EXHAUSTED, NO_CODE }
}
