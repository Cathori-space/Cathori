package org.cathori.backend.user.application;

import org.cathori.backend.common.exception.BusinessException;
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

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
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
    public void clearDeviceToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        user.clearDeviceToken();
    }
}
