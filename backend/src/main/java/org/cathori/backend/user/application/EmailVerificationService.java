package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final VerificationStore verificationStore;
    private final VerifiedEmailStore verifiedEmailStore;
    private final NotificationPort notificationPort;

    public EmailVerificationService(VerificationStore verificationStore,
                                    VerifiedEmailStore verifiedEmailStore,
                                    NotificationPort notificationPort) {
        this.verificationStore = verificationStore;
        this.verifiedEmailStore = verifiedEmailStore;
        this.notificationPort = notificationPort;
    }

    public void sendCode(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        verificationStore.save(email, code);
        notificationPort.sendVerificationCode(email, code);
    }

    public void verifyCode(String email, String code) {
        VerificationStore.Entry entry = verificationStore.find(email)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_VERIFY_CODE_EXPIRED));

        if (entry.expiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(UserErrorCode.USER_VERIFY_CODE_EXPIRED);
        }

        if (!entry.code().equals(code)) {
            throw new BusinessException(UserErrorCode.USER_INVALID_VERIFY_CODE);
        }

        verifiedEmailStore.markVerified(email);
        verificationStore.remove(email);
    }
}
