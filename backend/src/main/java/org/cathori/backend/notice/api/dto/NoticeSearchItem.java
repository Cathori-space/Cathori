package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Notice search result item.
 */
public record NoticeSearchItem(
        @Schema(example = "1") String noticeId,
        @Schema(example = "장학") String category,
        @Schema(example = "2026학년도 1학기 국가장학금 신청 안내") String title,
        @Schema(example = "학생지원팀") String department,
        @Schema(example = "2026-03-28") LocalDate publishedAt,
        @Schema(example = "2026-04-30") String deadlineAt
) {}
