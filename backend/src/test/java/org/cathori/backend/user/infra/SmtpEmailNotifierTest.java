package org.cathori.backend.user.infra;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

import java.time.Duration;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@DisplayName("SmtpEmailNotifier — 발송 실패 응답")
class SmtpEmailNotifierTest {

    @Test
    @DisplayName("SMTP 발송이 실패하면 500이 아니라 503 EMAIL_SEND_FAILED (ADR D7)")
    void mailFailureBecomesServiceUnavailable() {
        // given — SMTP가 응답하지 않는다
        JavaMailSender mailSender = mock(JavaMailSender.class);
        doThrow(new MailSendException("timeout")).when(mailSender).send(any(SimpleMailMessage.class));
        SmtpEmailNotifier notifier = new SmtpEmailNotifier(mailSender, "no-reply@cathori.test", Duration.ofMinutes(3));

        // when
        BusinessException e = catchThrowableOfType(BusinessException.class,
                () -> notifier.sendVerificationCode(VerificationPurpose.SIGNUP, "student@catholic.ac.kr", "123456"));

        // then
        assertThat(e.getErrorCode()).isEqualTo(UserErrorCode.EMAIL_SEND_FAILED);
    }
}
