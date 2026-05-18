package org.cathori.backend.tag.domain;

import java.util.Optional;

public interface TagRepository {
    Tag save(Tag tag);
    boolean existsByUserIdAndName(Long userId, String name);
    long countByUserId(Long userId);
    Optional<Tag> findByIdAndUserId(Long tagId, Long userId);
    void delete(Tag tag);
}
