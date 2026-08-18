package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * 공지 키워드 검색의 페이징 응답.
 *
 * hasNext=true이면 다음 페이지가 존재하며, 클라이언트는 page를 +1해 추가 요청한다.
 * 내부적으로 size+1건을 조회해 초과 여부로 hasNext를 판정하므로 content 크기는 최대 size개다.
 */
public record NoticeSearchResponse(
        List<NoticeSearchItem> content,
        @Schema(example = "0") int page,
        @Schema(example = "10") int size,
        @Schema(example = "true") boolean hasNext
) {}
