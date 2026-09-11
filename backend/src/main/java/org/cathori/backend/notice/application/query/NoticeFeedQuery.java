package org.cathori.backend.notice.application.query;

import java.util.List;


/**
 * 공지 피드 조회 조건을 담는 쿼리 객체. 사용자의 전공·복수전공·관심 태그를 기반으로
 * 개인화된 공지를 필터링하며, category가 null이면 전체 카테고리를 대상으로 조회한다.
 *
 * @param userId      조회 요청자(로그인 사용자) ID
 * @param major       사용자의 제1전공 학과 코드
 * @param secondMajor 사용자의 복수전공 학과 코드. "전공심화"이면 별도 학과 필터로 취급하지 않고
 *                    제외되며(제1전공 범위만 적용), 복수전공이 없으면 null
 * @param category    필터링할 공지 분류, null이면 전체 카테고리 대상
 * @param tags        사용자 관심 태그 목록, 제목에 포함된 태그만 응답에 매칭시키는 용도로 쓰임
 * @param page        0부터 시작하는 페이지 번호
 * @param size        페이지당 조회 건수
 */
public record NoticeFeedQuery(
        Long userId,
        String major,
        String secondMajor,
        String category,
        List<String> tags,
        int page,
        int size
) {}
