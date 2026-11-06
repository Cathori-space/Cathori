package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.EmailDomainPolicy;
import org.cathori.backend.user.application.email.EmailSendLimitPolicy;
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
    private final EmailSendLimitPolicy emailSendLimitPolicy;
    private final Duration codeTtl;

    public EmailVerificationService(VerificationCodeStore verificationCodeStore,
                                    VerifiedEmailStore verifiedEmailStore,
                                    NotificationPort notificationPort,
                                    EmailDomainPolicy emailDomainPolicy,
                                    EmailSendLimitPolicy emailSendLimitPolicy,
                                    @Value("${auth.email.code-ttl:PT3M}") Duration codeTtl) {
        this.verificationCodeStore = verificationCodeStore;
        this.verifiedEmailStore = verifiedEmailStore;
        this.notificationPort = notificationPort;
        this.emailDomainPolicy = emailDomainPolicy;
        this.emailSendLimitPolicy = emailSendLimitPolicy;
        this.codeTtl = codeTtl;
    }

    public void sendCode(VerificationPurpose purpose, String email) {
        emailDomainPolicy.requireAllowed(purpose, email);
        emailSendLimitPolicy.requireSendable(email);

        String code = reusableOrNewCode(purpose, email);
        notificationPort.sendVerificationCode(purpose, email, code);
        emailSendLimitPolicy.recordSent(email);
    }

    /**
     * 쓸 수 있는 번호가 있으면 그 번호를, 없으면 새로 발급해 저장한다 (ADR D2).
     * 재사용할 때는 다시 저장하지 않는다 — 저장하면 만료 시각·실패 횟수가 초기화된다.
     */
    private String reusableOrNewCode(VerificationPurpose purpose, String email) {
        Instant now = Instant.now();
        return verificationCodeStore.find(purpose, email)
                .filter(existing -> existing.isReusable(now))
                .map(VerificationCode::code)
                .orElseGet(() -> {
                    String fresh = String.format("%06d", RANDOM.nextInt(1_000_000));
                    verificationCodeStore.save(purpose, email, VerificationCode.issue(fresh, now, codeTtl));
                    return fresh;
                });
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
