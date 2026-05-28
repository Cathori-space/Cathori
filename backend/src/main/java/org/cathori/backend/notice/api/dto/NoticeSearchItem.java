package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * 공지 키워드 검색 결과 목록의 단건 항목.
 *
 * 사용자가 검색어를 입력했을 때 결과 목록에 표시되는 카드 한 장에 해당한다.
 * dDay는 오늘 기준 마감일까지 남은 일수(양수=남음, 음수=초과, null=마감일 없는 공지).
 */
public record NoticeSearchItem(
        @Schema(example = "1") String noticeId,
        @Schema(example = "장학") String category,
        @Schema(example = "2026학년도 1학기 국가장학금 신청 안내") String title,
        @Schema(example = "학생지원팀") String department,
        @Schema(example = "2026-03-28") LocalDate publishedAt,
        @Schema(example = "3") Integer dDay
) {}
