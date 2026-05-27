package org.cathori.backend.tag.infra;

import org.cathori.backend.tag.domain.Tag;
import org.cathori.backend.tag.domain.TagRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TagRepositoryImpl implements TagRepository {

    private final TagJpaRepository jpaRepository;

    public TagRepositoryImpl(TagJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Tag save(Tag tag) {
        return jpaRepository.save(tag);
    }

    @Override
    public boolean existsByUserIdAndName(Long userId, String name) {
        return jpaRepository.existsByUserIdAndName(userId, name);
    }

    @Override
    public long countByUserId(Long userId) {
        return jpaRepository.countByUserId(userId);
    }

    @Override
    public Optional<Tag> findByIdAndUserId(Long tagId, Long userId) {
        return jpaRepository.findByIdAndUserId(tagId, userId);
    }

    @Override
    public List<Tag> findAllByUserId(Long userId) {
        return jpaRepository.findAllByUserId(userId);
    }

    @Override
    public void delete(Tag tag) {
        jpaRepository.delete(tag);
    }
}
