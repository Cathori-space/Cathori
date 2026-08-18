package org.cathori.backend.tag.infra;

import org.cathori.backend.tag.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TagJpaRepository extends JpaRepository<Tag, Long> {
    boolean existsByUserIdAndName(Long userId, String name);
    long countByUserId(Long userId);
    Optional<Tag> findByIdAndUserId(Long id, Long userId);
    List<Tag> findAllByUserId(Long userId);
    void deleteByUserId(Long userId);
}
