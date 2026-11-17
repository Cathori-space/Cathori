package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "학교 공통 공지의 공개 검색 항목")
public record PublicNoticeSearchItem(
        @Schema(description = "문자열로 반환하는 공지 ID", example = "1") String noticeId,
        @Schema(description = "공지 카테고리", example = "장학") String category,
        @Schema(description = "공지 제목", example = "2026학년도 2학기 국가장학금 신청 안내") String title,
        @Schema(description = "공지 게시 부서", example = "학생지원팀") String department,
        @Schema(description = "공지 게시일", example = "2026-11-17", format = "date") LocalDate publishedAt,
        @Schema(description = "공지 마감일. 마감일이 없으면 null", example = "2026-11-30",
                format = "date", nullable = true) String deadlineAt
) {}
