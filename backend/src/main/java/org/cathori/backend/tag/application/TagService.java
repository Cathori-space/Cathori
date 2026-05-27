package org.cathori.backend.tag.application;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.tag.TagErrorCode;
import org.cathori.backend.tag.api.dto.TagResponse;
import org.cathori.backend.tag.domain.Tag;
import org.cathori.backend.tag.domain.TagRepository;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    private static final int MAX_TAG_COUNT = 20;

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public TagService(TagRepository tagRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTags(Long userId) {
        return tagRepository.findByUserId(userId).stream()
                .map(TagResponse::from)
                .toList();
    }

    @Transactional
    public TagResponse createTag(Long userId, String rawName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        String name = rawName.trim();
        String normalizedName = Tag.normalize(name);

        if (tagRepository.countByUserId(userId) >= MAX_TAG_COUNT) {
            throw new BusinessException(TagErrorCode.TAG_LIMIT_EXCEEDED);
        }

        if (tagRepository.existsByUserIdAndNormalizedName(userId, normalizedName)) {
            throw new BusinessException(TagErrorCode.TAG_DUPLICATE);
        }

        int sortOrder = (int) tagRepository.countByUserId(userId) + 1;
        Tag saved = tagRepository.save(Tag.create(user, name, sortOrder));
        return TagResponse.from(saved);
    }

    @Transactional
    public void deleteTag(Long userId, Long tagId) {
        Tag tag = tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new BusinessException(TagErrorCode.TAG_NOT_FOUND));

        tagRepository.delete(tag);
    }
}
