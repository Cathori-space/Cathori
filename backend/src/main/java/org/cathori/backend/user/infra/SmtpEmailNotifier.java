package org.cathori.backend.user.infra;

import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class SmtpEmailNotifier implements NotificationPort {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final Duration codeTtl;

    public SmtpEmailNotifier(JavaMailSender mailSender,
                             @Value("${mail.from:${spring.mail.username}}") String fromAddress,
                             @Value("${auth.email.code-ttl:PT3M}") Duration codeTtl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.codeTtl = codeTtl;
    }

    @Override
    public void sendVerificationCode(VerificationPurpose purpose, String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject(subjectOf(purpose));
        message.setText(bodyOf(purpose, code));
        mailSender.send(message);
    }

    private String subjectOf(VerificationPurpose purpose) {
        return switch (purpose) {
            case SIGNUP -> "[Cathori] 이메일 인증번호";   // ADR D4 문구
            case PASSWORD_RESET -> "[Cathori] 비밀번호 재설정 인증번호";
        };
    }

    private String bodyOf(VerificationPurpose purpose, String code) {
        String guide = switch (purpose) {
            case SIGNUP -> "회원가입을 계속하려면 아래 인증번호를 입력해 주세요.";
            // 본인이 요청하지 않은 재설정 메일을 받았을 때 무엇을 해야 하는지 알려준다.
            case PASSWORD_RESET -> "비밀번호 재설정을 위해 아래 인증번호를 입력해 주세요.\n"
                    + "본인이 요청하지 않았다면 이 메일을 무시해 주세요.";
        };
        return guide + "\n\n인증번호: " + code + "\n" + codeTtl.toMinutes() + "분 내에 입력해 주세요.";
    }
}
