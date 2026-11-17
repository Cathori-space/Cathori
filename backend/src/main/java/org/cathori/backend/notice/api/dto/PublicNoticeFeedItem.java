package org.cathori.backend.notice.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "학교 공통 공지의 공개 피드 항목")
public record PublicNoticeFeedItem(
        @Schema(description = "문자열로 반환하는 공지 ID", example = "1") String noticeId,
        @Schema(description = "공지 카테고리", example = "장학") String category,
        @Schema(description = "공지 제목", example = "2026학년도 2학기 국가장학금 신청 안내") String title,
        @Schema(description = "공지 게시 부서", example = "학생지원팀") String department,
        @Schema(description = "공지 게시일", example = "2026-11-17", format = "date") LocalDate publishedAt,
        @Schema(description = "저장된 AI 요약의 JSON 배열 문자열. 요약 상태가 SUCCESS가 아니면 null",
                example = "[\"국가장학금 신청 안내\",\"신청 기간 확인\",\"제출 서류 확인\"]", nullable = true) String aiSummary,
        @Schema(description = "저장된 AI 요약 상태. 공개 조회에서는 요약 생성이나 재시도를 실행하지 않음",
                example = "SUCCESS", allowableValues = {"PENDING", "SUCCESS", "FAILED"}) String aiSummaryStatus,
        @Schema(description = "공지 원문 URL", example = "https://www.catholic.ac.kr/notice/1") String url,
        @Schema(description = "저장된 조회수. 공개 조회에서는 증가하지 않음", example = "42") Long viewCount,
        @Schema(description = "공지 마감일. 마감일이 없으면 null", example = "2026-11-30",
                format = "date", nullable = true) String deadlineAt
) {}
