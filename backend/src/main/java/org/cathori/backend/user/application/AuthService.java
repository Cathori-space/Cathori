package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.security.JwtUtil;
import org.cathori.backend.tag.application.TagService;
import org.cathori.backend.tag.api.dto.TagDto;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.LoginRequest;
import org.cathori.backend.user.api.dto.LoginResponse;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.api.dto.RegisterResponse;
import org.cathori.backend.user.api.dto.ReissueRequest;
import org.cathori.backend.user.api.dto.ReissueResponse;
import org.cathori.backend.user.domain.RefreshToken;
import org.cathori.backend.user.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final VerifiedEmailStore verifiedEmailStore;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TagService tagService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token-expiry}")
    private long refreshTokenExpiry;

    public AuthService(VerifiedEmailStore verifiedEmailStore, UserService userService,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil, TagService tagService,
                       RefreshTokenRepository refreshTokenRepository) {
        this.verifiedEmailStore = verifiedEmailStore;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.tagService = tagService;
        this.refreshTokenRepository = refreshTokenRepository;
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

    public LoginResponse login(LoginRequest request) {
        User user = userService.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BusinessException(UserErrorCode.USER_INVALID_PASSWORD);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId());
        String refreshTokenValue = jwtUtil.generateRefreshToken(user.getId());

        refreshTokenRepository.deleteByUserId(user.getId());
        refreshTokenRepository.save(RefreshToken.create(user.getId(), refreshTokenValue, refreshTokenExpiry));

        List<TagDto> tags = tagService.getTagsByUserId(user.getId());

        return new LoginResponse(
                accessToken, refreshTokenValue,
                user.getId(), user.getEmail(),
                user.getMajor(), user.getSecondMajor(),
                user.getGrade(), user.getEnrollmentStatus(),
                tags
        );
    }

    public ReissueResponse reissue(ReissueRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException(UserErrorCode.REFRESH_TOKEN_INVALID));

        if (stored.isExpired()) {
            refreshTokenRepository.deleteByUserId(stored.getUserId());
            throw new BusinessException(UserErrorCode.REFRESH_TOKEN_INVALID);
        }

        String newAccessToken = jwtUtil.generateAccessToken(stored.getUserId());
        String newRefreshTokenValue = jwtUtil.generateRefreshToken(stored.getUserId());

        refreshTokenRepository.deleteByUserId(stored.getUserId());
        refreshTokenRepository.save(RefreshToken.create(stored.getUserId(), newRefreshTokenValue, refreshTokenExpiry));

        return new ReissueResponse(newAccessToken, newRefreshTokenValue);
    }
}
