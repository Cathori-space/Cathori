package org.cathori.backend.notice.application.query;

import java.time.LocalDate;

/**
 * 공지 피드/북마크 조회 결과 한 건을 담는 DB 조회 row.
 *
 * @param id              공지 ID
 * @param sourceType      공지 출처 유형 (예: "MAIN", "DEPARTMENT")
 * @param category        공지 분류(목록 표시용 카테고리)
 * @param title           공지 제목
 * @param department      작성 부서/학과명
 * @param postedAt        게시일
 * @param deadlineAt      공지에서 추출된 마감일, 없으면 null
 * @param aiSummary       AI 요약 본문, aiSummaryStatus가 SUCCESS일 때만 값이 채워짐(PENDING/FAILED면 null)
 * @param aiSummaryStatus AI 요약 처리 상태 (PENDING / SUCCESS / FAILED)
 * @param url             공지 상세 페이지의 원문 URL
 * @param viewCount       조회수
 * @param isBookmarked    조회 요청자가 이 공지를 북마크했는지 여부
 */
public record NoticeRow(
        Long id,
        String sourceType,
        String category,
        String title,
        String department,
        LocalDate postedAt,
        LocalDate deadlineAt,
        String aiSummary,
        String aiSummaryStatus,
        String url,
        Long viewCount,
        boolean isBookmarked
) {}
