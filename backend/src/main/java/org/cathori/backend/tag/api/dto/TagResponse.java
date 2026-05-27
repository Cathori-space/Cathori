package org.cathori.backend.tag.api.dto;

import org.cathori.backend.tag.domain.Tag;

public record TagResponse(
        Long tagId,
        String tagName,
        int sortOrder
) {
    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getId(), tag.getName(), tag.getSortOrder());
    }
}
