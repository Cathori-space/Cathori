package org.cathori.backend.tag.infra;

import org.cathori.backend.tag.domain.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TagJpaRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUserIdOrderBySortOrderAscIdAsc(Long userId);
    long countByUserId(Long userId);
    boolean existsByUserIdAndNormalizedName(Long userId, String normalizedName);
    Optional<Tag> findByIdAndUserId(Long id, Long userId);
}
