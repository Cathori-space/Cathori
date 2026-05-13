package org.cathori.backend.user.domain;

public interface UserRepository {
    User save(User user);
    boolean existsByEmail(String email);
}
