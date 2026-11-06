package org.cathori.backend.user.infra;

import jakarta.persistence.LockModeType;
import org.cathori.backend.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<User, Long> {
    String PUSH_ELIGIBLE_CLAIM = """
            JOIN device_token_claims c ON c.user_id = u.id
              AND c.token_hash = encode(sha256(convert_to(u.device_token, 'UTF8')), 'hex')
              AND c.latest_claim IS TRUE
              AND c.confirmed_session_version = c.session_version
              AND c.session_version = u.session_version
            """;

    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findByEmailForUpdate(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:tokenHash, 217))", nativeQuery = true)
    int lockDeviceToken(@Param("tokenHash") String tokenHash);

    @Query("SELECT u.id FROM User u WHERE u.deviceToken = :deviceToken")
    Optional<Long> findDeviceTokenOwnerId(@Param("deviceToken") String deviceToken);

    @Query("""
            SELECT COUNT(c) > 0 FROM DeviceTokenClaim c
            WHERE c.tokenHash = :tokenHash AND NOT EXISTS (
                SELECT owner.id FROM DeviceTokenClaim owner
                WHERE owner.tokenHash = :tokenHash AND owner.user.id = :userId AND owner.latestClaim = true
            )
            """)
    boolean isDeviceTokenClaimUnavailable(@Param("tokenHash") String tokenHash, @Param("userId") Long userId);

    @Modifying
    @Query("""
            UPDATE DeviceTokenClaim c SET c.confirmedSessionVersion = null
            WHERE c.tokenHash = :tokenHash AND c.user.id = :userId AND c.confirmedSessionVersion = :sessionVersion
            """)
    void clearDeviceTokenConfirmation(@Param("tokenHash") String tokenHash, @Param("userId") Long userId,
                                      @Param("sessionVersion") long sessionVersion);

    @Modifying
    @Query(value = """
            INSERT INTO device_token_claims (token_hash, user_id, session_version, latest_claim, confirmed_session_version)
            VALUES (:tokenHash, :userId, :sessionVersion, true, :sessionVersion)
            ON CONFLICT (token_hash, user_id) DO UPDATE
            SET session_version = EXCLUDED.session_version, latest_claim = true,
                confirmed_session_version = EXCLUDED.confirmed_session_version
            """, nativeQuery = true)
    void upsertDeviceTokenClaim(@Param("tokenHash") String tokenHash, @Param("userId") Long userId,
                                @Param("sessionVersion") long sessionVersion);

    @Query(value = """
            SELECT DISTINCT u.* FROM users u
            """ + PUSH_ELIGIBLE_CLAIM + """
            JOIN user_tag t ON t.user_id = u.id
            WHERE :title LIKE '%' || t.name || '%'
            """, nativeQuery = true)
    List<User> findPushEligibleUsersWithTagMatchingTitle(@Param("title") String title);

    @Query(value = "SELECT t.user_id AS userId, MIN(t.name) AS matchedTag FROM user_tag t WHERE :title LIKE '%' || t.name || '%' GROUP BY t.user_id", nativeQuery = true)
    List<UserMatchedTagView> findFirstMatchedTagsByTitle(@Param("title") String title);

    @Query(value = """
            SELECT u.id AS id, u.device_token AS "deviceToken" FROM users u
            """ + PUSH_ELIGIBLE_CLAIM + """
            WHERE u.id IN (:userIds)
            """, nativeQuery = true)
    List<UserDeviceTokenView> findDeviceTokensByIds(@Param("userIds") List<Long> userIds);
}
