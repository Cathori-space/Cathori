package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.security.TokenHasher;
import org.cathori.backend.notification.domain.AlertHistoryRepository;
import org.cathori.backend.bookmark.domain.BookmarkRepository;
import org.cathori.backend.tag.domain.TagRepository;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TagRepository tagRepository;
    private final BookmarkRepository bookmarkRepository;
    private final AlertHistoryRepository alertHistoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenHasher tokenHasher;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TagRepository tagRepository, BookmarkRepository bookmarkRepository,
                       AlertHistoryRepository alertHistoryRepository,
                       RefreshTokenRepository refreshTokenRepository, TokenHasher tokenHasher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tagRepository = tagRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.alertHistoryRepository = alertHistoryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenHasher = tokenHasher;
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    Optional<User> findByEmailForUpdate(String email) {
        return userRepository.findByEmailForUpdate(email);
    }

    Optional<User> findByIdForUpdate(Long userId) {
        return userRepository.findByIdForUpdate(userId);
    }

    @Transactional
    public User save(RegisterRequest request) {
        String encoded = passwordEncoder.encode(request.password());
        return userRepository.save(
                User.create(request.email(), encoded,
                        request.major1(), request.major2(),
                        request.grade(), request.status())
        );
    }

    @Transactional
    public void updateDeviceToken(Long userId, long sessionVersion, String deviceToken) {
        String tokenHash = tokenHasher.hash(deviceToken);
        userRepository.lockDeviceToken(tokenHash);
        Long ownerId = userRepository.findDeviceTokenOwnerId(deviceToken).orElse(userId);
        List<Long> ids = userId.equals(ownerId) ? List.of(userId) : List.of(userId, ownerId);
        List<User> lockedUsers = userRepository.findAllByIdsForUpdate(ids);
        User user = requireCurrentSession(lockedUsers.stream().filter(candidate -> candidate.getId().equals(userId))
                .findFirst(), sessionVersion);

        if (userRepository.isDeviceTokenClaimDisplaced(tokenHash, userId, sessionVersion)) {
            throw new BusinessException(UserErrorCode.DEVICE_TOKEN_OWNERSHIP_CONFLICT);
        }
        lockedUsers.stream()
                .filter(previous -> !previous.getId().equals(userId) && deviceToken.equals(previous.getDeviceToken()))
                .findFirst().ifPresent(previous -> {
                    previous.clearDeviceToken();
                    userRepository.flushDeviceTokenChange();
                });

        if (!deviceToken.equals(user.getDeviceToken())) clearCurrentDeviceTokenConfirmation(user);
        userRepository.recordDeviceTokenClaim(tokenHash, userId, sessionVersion);
        user.updateDeviceToken(deviceToken);
        userRepository.flushDeviceTokenChange();
    }

    @Transactional
    public void withdraw(Long userId, long sessionVersion) {
        User user = requireCurrentSessionForUpdate(userId, sessionVersion);

        tagRepository.deleteByUserId(userId);
        bookmarkRepository.deleteByUserId(userId);
        alertHistoryRepository.deleteByUserId(userId);
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.delete(user);
    }

    @Transactional
    public void clearDeviceToken(Long userId, long sessionVersion) {
        User user = requireCurrentSessionForUpdate(userId, sessionVersion);
        clearCurrentDeviceTokenConfirmation(user);
        user.clearDeviceToken();
    }

    private void clearCurrentDeviceTokenConfirmation(User user) {
        String deviceToken = user.getDeviceToken();
        if (deviceToken != null) {
            userRepository.clearDeviceTokenConfirmation(tokenHasher.hash(deviceToken), user.getId(), user.getSessionVersion());
        }
    }

    User requireCurrentSessionForUpdate(Long userId, long sessionVersion) {
        return requireCurrentSession(findByIdForUpdate(userId), sessionVersion);
    }

    private User requireCurrentSession(Optional<User> user, long sessionVersion) {
        return user
                .filter(candidate -> candidate.getSessionVersion() == sessionVersion)
                .orElseThrow(() -> new BusinessException(UserErrorCode.SESSION_INVALID));
    }
}
