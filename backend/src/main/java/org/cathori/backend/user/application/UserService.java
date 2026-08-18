package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.alert.application.AlertHistoryRepository;
import org.cathori.backend.bookmark.domain.BookmarkRepository;
import org.cathori.backend.tag.domain.TagRepository;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TagRepository tagRepository;
    private final BookmarkRepository bookmarkRepository;
    private final AlertHistoryRepository alertHistoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TagRepository tagRepository, BookmarkRepository bookmarkRepository,
                       AlertHistoryRepository alertHistoryRepository,
                       RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tagRepository = tagRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.alertHistoryRepository = alertHistoryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
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
    public void updateDeviceToken(Long userId, String deviceToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        user.updateDeviceToken(deviceToken);
    }

    @Transactional
    public void withdraw(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        tagRepository.deleteByUserId(userId);
        bookmarkRepository.deleteByUserId(userId);
        alertHistoryRepository.deleteByUserId(userId);
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.delete(user);
    }

    public void clearDeviceToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        user.clearDeviceToken();
    }
}
