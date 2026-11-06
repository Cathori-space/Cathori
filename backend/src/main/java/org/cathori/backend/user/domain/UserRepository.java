package org.cathori.backend.user.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UserRepository {
    User save(User user);
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    Optional<User> findById(Long id);
    Optional<User> findByEmailForUpdate(String email);
    Optional<User> findByIdForUpdate(Long id);
    void lockDeviceToken(String tokenHash);
    Optional<Long> findDeviceTokenOwnerId(String deviceToken);
    List<User> findAllByIdsForUpdate(List<Long> ids);
    boolean isDeviceTokenClaimDisplaced(String tokenHash, Long userId, long sessionVersion);
    void clearDeviceTokenConfirmation(String tokenHash, Long userId, long sessionVersion);
    void recordDeviceTokenClaim(String tokenHash, Long userId, long sessionVersion);
    void flushDeviceTokenChange();
    List<User> findPushEligibleUsersWithTagMatchingTitle(String title);
    Map<Long, String> findFirstMatchedTagsByTitle(String title);
    Map<Long, String> findDeviceTokensByIds(List<Long> userIds);
    void delete(User user);
}
