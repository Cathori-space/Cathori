package org.cathori.backend.user.infra;

import org.cathori.backend.user.application.NotificationPort;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailNotifier implements NotificationPort {

    private final JavaMailSender mailSender;

    public SmtpEmailNotifier(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendVerificationCode(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[Cathori] 이메일 인증번호");
        message.setText("인증번호: " + code + "\n3분 내에 입력해 주세요.");
        mailSender.send(message);
    }
}
