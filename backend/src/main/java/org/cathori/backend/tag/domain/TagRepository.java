package org.cathori.backend.tag.domain;

import java.util.List;
import java.util.Optional;

public interface TagRepository {
    Tag save(Tag tag);
    List<Tag> findByUserId(Long userId);
    long countByUserId(Long userId);
    boolean existsByUserIdAndNormalizedName(Long userId, String normalizedName);
    Optional<Tag> findByIdAndUserId(Long tagId, Long userId);
    void delete(Tag tag);
}
