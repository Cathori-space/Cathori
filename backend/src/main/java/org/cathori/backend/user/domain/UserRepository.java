package org.cathori.backend.user.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UserRepository {
    User save(User user);
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    Optional<User> findById(Long id);
    List<User> findUsersWithTagMatchingTitle(String title);
    Map<Long, String> findFirstMatchedTagsByTitle(String title);
    void delete(User user);
}
