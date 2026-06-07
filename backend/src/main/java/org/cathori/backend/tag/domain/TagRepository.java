package org.cathori.backend.tag.domain;

import java.util.List;
import java.util.Optional;

public interface TagRepository {
    Tag save(Tag tag);
    boolean existsByUserIdAndName(Long userId, String name);
    long countByUserId(Long userId);
    Optional<Tag> findByIdAndUserId(Long tagId, Long userId);
    List<Tag> findAllByUserId(Long userId);
    void delete(Tag tag);
    void deleteByUserId(Long userId);
}
