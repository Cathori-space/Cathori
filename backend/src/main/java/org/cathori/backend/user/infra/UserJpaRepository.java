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

    @Query(value = "SELECT t.user_id, MIN(t.name) AS matched_tag FROM user_tag t WHERE :title LIKE '%' || t.name || '%' GROUP BY t.user_id", nativeQuery = true)
    List<Object[]> findFirstMatchedTagsByTitle(@Param("title") String title);
}
