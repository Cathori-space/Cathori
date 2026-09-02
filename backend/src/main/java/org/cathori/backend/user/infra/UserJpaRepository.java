package org.cathori.backend.user.infra;

import org.cathori.backend.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);

    @Query(value = "SELECT DISTINCT u.* FROM users u JOIN user_tag t ON t.user_id = u.id WHERE :title LIKE '%' || t.name || '%'", nativeQuery = true)
    List<User> findUsersWithTagMatchingTitle(@Param("title") String title);

    @Query(value = "SELECT t.user_id AS userId, MIN(t.name) AS matchedTag FROM user_tag t WHERE :title LIKE '%' || t.name || '%' GROUP BY t.user_id", nativeQuery = true)
    List<UserMatchedTagView> findFirstMatchedTagsByTitle(@Param("title") String title);

    @Query("SELECT u.id AS id, u.deviceToken AS deviceToken FROM User u WHERE u.id IN :userIds AND u.deviceToken IS NOT NULL")
    List<UserDeviceTokenView> findDeviceTokensByIds(@Param("userIds") List<Long> userIds);
}
