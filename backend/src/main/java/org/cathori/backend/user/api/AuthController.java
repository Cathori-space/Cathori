package org.cathori.backend.user.api;

import jakarta.validation.Valid;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.security.CustomUserDetails;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.*;
import org.cathori.backend.user.application.AuthService;
import org.cathori.backend.user.application.EmailVerificationService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


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

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/reissue")
    public ResponseEntity<ReissueResponse> reissue(@RequestBody @Valid ReissueRequest request) {
        return ResponseEntity.ok(authService.reissue(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.logout(userDetails.getUserId(), userDetails.getSessionVersion());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout/refresh")
    public ResponseEntity<Void> logoutWithRefreshToken(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new BusinessException(UserErrorCode.REFRESH_TOKEN_INVALID);
        }
        authService.logoutWithRefreshToken(authorization.substring(7));
        return ResponseEntity.noContent().build();
    }
}
