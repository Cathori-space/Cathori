package org.cathori.backend.notice.infra.crawling.model;

import java.util.List;

/**
 * 공지 상세 페이지를 파싱한 결과.
 *
 * @param bodyText  본문 텍스트(HTML 태그 제거된 순수 텍스트)
 * @param imageUrls 본문에 포함된 이미지의 절대 URL 목록(본문 내 등장 순서)
 */
public record NoticeDetails(String bodyText, List<String> imageUrls) {
}
