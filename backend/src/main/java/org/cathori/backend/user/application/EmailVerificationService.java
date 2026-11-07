package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.VerificationCode;
import org.cathori.backend.user.application.email.VerificationCodeStore;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final VerificationCodeStore verificationCodeStore;
    private final VerifiedEmailStore verifiedEmailStore;
    private final NotificationPort notificationPort;
    private final EmailDomainPolicy emailDomainPolicy;
    private final Duration codeTtl;

    public EmailVerificationService(VerificationCodeStore verificationCodeStore,
                                    VerifiedEmailStore verifiedEmailStore,
                                    NotificationPort notificationPort,
                                    EmailDomainPolicy emailDomainPolicy,
                                    @Value("${auth.email.code-ttl:PT10M}") Duration codeTtl) {
        this.verificationCodeStore = verificationCodeStore;
        this.verifiedEmailStore = verifiedEmailStore;
        this.notificationPort = notificationPort;
        this.emailDomainPolicy = emailDomainPolicy;
        this.codeTtl = codeTtl;
    }

    public void sendCode(VerificationPurpose purpose, String email) {
        emailDomainPolicy.requireAllowed(purpose, email);
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        verificationCodeStore.save(purpose, email, VerificationCode.issue(code, Instant.now(), codeTtl));
        notificationPort.sendVerificationCode(purpose, email, code);
    }

    public void verifyCode(VerificationPurpose purpose, String email, String code) {
        emailDomainPolicy.requireAllowed(purpose, email);
        VerificationCode issued = verificationCodeStore.find(purpose, email)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_VERIFY_CODE_EXPIRED));

        // 만료는 캐시 TTL이 아니라 expiresAt으로 본다 — 실패 누적으로 다시 저장하면 캐시 TTL은 리셋된다.
        if (issued.isExpired(Instant.now())) {
            verificationCodeStore.remove(purpose, email);
            throw new BusinessException(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        }

        if (!issued.matches(code)) {
            // 실패 횟수 누적만 해둔다. 5회 제한 판정은 아직 없다 (ADR D3).
            verificationCodeStore.save(purpose, email, issued.withFailure());
            throw new BusinessException(UserErrorCode.USER_INVALID_VERIFY_CODE);
        }

        verifiedEmailStore.markVerified(purpose, email);
        verificationCodeStore.remove(purpose, email);
    }
}
