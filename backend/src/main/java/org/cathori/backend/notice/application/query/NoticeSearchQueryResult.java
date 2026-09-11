package org.cathori.backend.notice.application.query;

import java.time.LocalDate;

/**
 * 공지 검색 결과 한 건을 담는 DB 조회 row.
 *
 * @param id           공지 ID
 * @param category     공지 분류(목록 표시용 카테고리)
 * @param title        공지 제목
 * @param department   작성 부서/학과명
 * @param postedAt     게시일
 * @param deadlineAt   공지에서 추출된 마감일, 없으면 null
 * @param isBookmarked 조회 요청자가 이 공지를 북마크했는지 여부
 */
public record NoticeSearchQueryResult(
        Long id,
        String category,
        String title,
        String department,
        LocalDate postedAt,
        LocalDate deadlineAt,
        boolean isBookmarked
) {}
