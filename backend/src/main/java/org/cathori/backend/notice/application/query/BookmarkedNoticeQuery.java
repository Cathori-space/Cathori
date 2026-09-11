package org.cathori.backend.notice.application.query;

/**
 * 로그인 사용자의 북마크 공지 목록 조회 조건.
 *
 * @param userId 조회 요청자(로그인 사용자) ID
 * @param page   0부터 시작하는 페이지 번호
 * @param size   페이지당 조회 건수
 */
public record BookmarkedNoticeQuery(
        Long userId,
        int page,
        int size
) {}
