package org.cathori.backend.notice.api.dto;

import java.util.List;

/**
 * Paged notice feed response.
 */
public record NoticeFeedResponse(
        List<NoticeFeedItem> content,
        int page,
        int size,
        boolean hasNext
) {}
