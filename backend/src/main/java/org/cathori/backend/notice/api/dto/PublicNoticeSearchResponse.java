package org.cathori.backend.notice.api.dto;

import java.util.List;

public record PublicNoticeSearchResponse(
        List<PublicNoticeSearchItem> content,
        int page,
        int size,
        boolean hasNext
) {}
