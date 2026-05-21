package org.cathori.backend.tag.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.tag.TagErrorCode;
import org.cathori.backend.tag.domain.Tag;
import org.cathori.backend.tag.domain.TagRepository;
import org.cathori.backend.tag.api.dto.TagDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    private static final int TAG_LIMIT = 20;

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional
    public TagDto createTag(Long userId, String tagName) {
        if (tagRepository.existsByUserIdAndName(userId, tagName)) {
            throw new BusinessException(TagErrorCode.TAG_DUPLICATE);
        }
        if (tagRepository.countByUserId(userId) >= TAG_LIMIT) {
            throw new BusinessException(TagErrorCode.TAG_LIMIT_EXCEEDED);
        }
        Tag saved = tagRepository.save(Tag.create(userId, tagName));
        return new TagDto(saved.getId(), saved.getName());
    }

    @Transactional(readOnly = true)
    public List<TagDto> getTagsByUserId(Long userId) {
        return tagRepository.findAllByUserId(userId).stream()
                .map(t -> new TagDto(t.getId(), t.getName()))
                .toList();
    }

    @Transactional
    public void deleteTag(Long userId, Long tagId) {
        Tag tag = tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new BusinessException(TagErrorCode.TAG_NOT_FOUND));
        tagRepository.delete(tag);
    }
}
