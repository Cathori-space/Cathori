package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.api.dto.RegisterResponse;
import org.cathori.backend.user.domain.User;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final VerifiedEmailStore verifiedEmailStore;
    private final UserService userService;

    public AuthService(VerifiedEmailStore verifiedEmailStore, UserService userService) {
        this.verifiedEmailStore = verifiedEmailStore;
        this.userService = userService;
    }

    public RegisterResponse register(RegisterRequest request) {
        if (!verifiedEmailStore.isVerified(request.email())) {
            throw new BusinessException(UserErrorCode.USER_NOT_VERIFIED);
        }

        if (userService.existsByEmail(request.email())) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_DUPLICATE);
        }

        User saved = userService.save(request);
        verifiedEmailStore.remove(request.email());
        return new RegisterResponse(saved.getId(), saved.getEmail());
    }
}
