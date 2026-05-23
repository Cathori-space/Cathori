package org.cathori.backend.notice.application;

import java.time.LocalDate;

/**
 * 공지 검색 쿼리의 DB 조회 원본 행(Row).
 *
 * 인프라 계층이 SQL 결과를 담아 서비스로 전달하는 내부 전달 객체다.
 * 서비스 계층에서 deadlineAt을 기준으로 dDay를 계산한 뒤 NoticeSearchItem DTO로 변환된다.
 * deadlineAt이 null이면 마감 기한이 없는 공지다.
 */
public record NoticeSearchRow(
        Long id,
        String category,
        String title,
        String department,
        LocalDate postedAt,
        LocalDate deadlineAt
) {}
