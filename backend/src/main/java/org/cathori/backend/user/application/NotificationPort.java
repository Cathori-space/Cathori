package org.cathori.backend.user.application;

public interface NotificationPort {
    void sendVerificationCode(String email, String code);
}
