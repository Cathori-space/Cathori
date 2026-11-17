package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "학교 공통 공지 공개 검색의 페이지 응답")
public record PublicNoticeSearchResponse(
        @Schema(description = "현재 페이지의 학교 공통 공지 목록. 최대 size개 반환") List<PublicNoticeSearchItem> content,
        @Schema(description = "0부터 시작하는 페이지 번호", example = "0", minimum = "0") int page,
        @Schema(description = "요청한 페이지 크기", example = "10", minimum = "1", maximum = "50") int size,
        @Schema(description = "다음 페이지 존재 여부. 학교 공통 공지 조회 조건을 기준으로 계산", example = "true") boolean hasNext
) {}
