package org.cathori.backend.notice.application;

import java.time.LocalDate;

/**
 * 인프라에서 application 레이어로 올라오는 공지 단건 조회 결과. NoticeFeedQuery가 "무엇을 가져올지"를 정의하는 입력이라면,
 * NoticeRow는 DB에서 읽어온 raw 결과이며, dDay 계산 등 가공은 이 객체를 받은 서비스에서 처리한다.
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
        String url,
        boolean isBookmarked
) {}
