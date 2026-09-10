package org.cathori.backend.notice.infra.crawling.model;

/**
 * 공지 목록 페이지의 행(row) 하나를 파싱한 결과.
 *
 * @param articleNo        원본 게시판에서 공지를 식별하는 게시글 번호
 * @param category         목록에 표시된 분류(칸막이 텍스트), 없으면 null
 * @param title            공지 제목
 * @param department       작성 부서/학과명
 * @param postedAt         원본 사이트에 표시된 게시일 문자열(파싱 전 원본 그대로)
 * @param noticeDetailsUrl 상세 페이지로 이동하는 절대 URL
 */
public record NoticeRow(
        String articleNo,
        String category,
        String title,
        String department,
        String postedAt,
        String noticeDetailsUrl
) {}
