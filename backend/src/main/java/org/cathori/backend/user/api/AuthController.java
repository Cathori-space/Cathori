package org.cathori.backend.user.api;

import jakarta.validation.Valid;
import org.cathori.backend.user.api.dto.*;
import org.cathori.backend.user.application.AuthService;
import org.cathori.backend.user.application.EmailVerificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final EmailVerificationService emailVerificationService;
    private final AuthService authService;

    public AuthController(EmailVerificationService emailVerificationService, AuthService authService) {
        this.emailVerificationService = emailVerificationService;
        this.authService = authService;
    }

    @PostMapping("/email/send")
    public ResponseEntity<EmailSendResponse> sendVerificationEmail(
            @RequestBody @Valid EmailSendRequest request) {
        emailVerificationService.sendCode(request.email());
        return ResponseEntity.ok(new EmailSendResponse(request.email()));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<EmailSendResponse> verifyCode(
            @RequestBody @Valid EmailVerifyRequest request) {
        emailVerificationService.verifyCode(request.email(), request.code());
        return ResponseEntity.ok(new EmailSendResponse(request.email()));
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }
}
