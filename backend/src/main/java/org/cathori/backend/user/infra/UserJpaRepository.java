package org.cathori.backend.user.infra;

import org.cathori.backend.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
}
