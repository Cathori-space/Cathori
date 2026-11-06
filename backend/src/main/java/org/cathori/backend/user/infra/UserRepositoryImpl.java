package org.cathori.backend.user.infra;

import jakarta.persistence.EntityManager;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class UserRepositoryImpl implements UserRepository {

    private final UserJpaRepository jpaRepository;
    private final EntityManager entityManager;

    public UserRepositoryImpl(UserJpaRepository jpaRepository, EntityManager entityManager) {
        this.jpaRepository = jpaRepository;
        this.entityManager = entityManager;
    }

    @Override
    public User save(User user) {
        return jpaRepository.save(user);
    }

    @Override
    public boolean existsByEmail(String email) {
        return jpaRepository.existsByEmail(email);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email);
    }

    @Override
    public Optional<User> findById(Long id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<User> findByEmailForUpdate(String email) {
        return refreshLockedUser(jpaRepository.findByEmailForUpdate(email));
    }

    @Override
    public Optional<User> findByIdForUpdate(Long id) {
        return refreshLockedUser(jpaRepository.findByIdForUpdate(id));
    }

    private Optional<User> refreshLockedUser(Optional<User> user) {
        // 잠금 조회가 영속성 컨텍스트에 이미 있는 엔티티를 반환할 수 있다.
        user.ifPresent(entityManager::refresh);
        return user;
    }

    @Override
    public void lockDeviceToken(String tokenHash) {
        jpaRepository.lockDeviceToken(tokenHash);
    }

    @Override
    public Optional<Long> findDeviceTokenOwnerId(String deviceToken) {
        return jpaRepository.findDeviceTokenOwnerId(deviceToken);
    }

    @Override
    public List<User> findAllByIdsForUpdate(List<Long> ids) {
        List<User> users = jpaRepository.findAllByIdsForUpdate(ids);
        users.forEach(entityManager::refresh);
        return users;
    }

    @Override
    public boolean isDeviceTokenClaimDisplaced(String tokenHash, Long userId, long sessionVersion) {
        return jpaRepository.isDeviceTokenClaimDisplaced(tokenHash, userId, sessionVersion);
    }

    @Override
    public void clearDeviceTokenConfirmation(String tokenHash, Long userId, long sessionVersion) {
        jpaRepository.clearDeviceTokenConfirmation(tokenHash, userId, sessionVersion);
    }

    @Override
    public void recordDeviceTokenClaim(String tokenHash, Long userId, long sessionVersion) {
        jpaRepository.displaceOtherDeviceTokenClaims(tokenHash, userId);
        jpaRepository.upsertDeviceTokenClaim(tokenHash, userId, sessionVersion);
    }

    @Override
    public void flushDeviceTokenChange() {
        try {
            entityManager.flush();
        } catch (ConstraintViolationException e) {
            if ("uk_users_device_token".equals(e.getConstraintName())) {
                throw new BusinessException(UserErrorCode.DEVICE_TOKEN_OWNERSHIP_CONFLICT);
            }
            throw e;
        }
    }

    @Override
    public List<User> findPushEligibleUsersWithTagMatchingTitle(String title) {
        return jpaRepository.findPushEligibleUsersWithTagMatchingTitle(title);
    }

    @Override
    public Map<Long, String> findFirstMatchedTagsByTitle(String title) {
        return jpaRepository.findFirstMatchedTagsByTitle(title).stream()
                .collect(Collectors.toMap(UserMatchedTagView::getUserId, UserMatchedTagView::getMatchedTag));
    }

    @Override
    public Map<Long, String> findDeviceTokensByIds(List<Long> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return jpaRepository.findDeviceTokensByIds(userIds).stream()
                .collect(Collectors.toMap(UserDeviceTokenView::getId, UserDeviceTokenView::getDeviceToken));
    }

    @Override
    public void delete(User user) {
        jpaRepository.delete(user);
    }
}
