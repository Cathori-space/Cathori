package org.cathori.backend.notice.api.dto;

import java.util.List;

public record PublicNoticeFeedResponse(
        List<PublicNoticeFeedItem> content,
        int page,
        int size,
        boolean hasNext
) {}
