package org.cathori.backend.notice.application.query;

/**
 * 공지 키워드 검색 유스케이스의 입력 파라미터.
 *
 * <p>사용자가 입력한 keyword로 공지 제목을 검색하되,
 * major·secondMajor를 기준으로 전체공지(MAIN)와 해당 학과 공지(DEPARTMENT)를 함께 탐색해
 * 본인과 관련 있는 공지만 결과에 포함시킨다.
 *
 * @param userId      조회 요청자(로그인 사용자) ID
 * @param keyword     공지 제목 검색어
 * @param major       사용자의 제1전공 학과 코드
 * @param secondMajor 사용자의 복수전공 학과 코드. "전공심화"이면 별도 학과 필터로 취급하지 않고
 *                    제외되며(제1전공 범위만 적용), 복수전공이 없으면 null
 * @param page        0부터 시작하는 페이지 번호
 * @param size        페이지당 조회 건수
 */
public record NoticeSearchQuery(
        Long userId,
        String keyword,
        String major,
        String secondMajor,
        int page,
        int size
) {}
