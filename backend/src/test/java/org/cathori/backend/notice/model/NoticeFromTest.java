package org.cathori.backend.notice.model;

import org.cathori.backend.notice.application.crawling.CrawledNotice;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Notice.from 컬럼 한도 보정")
class NoticeFromTest {

    /** articleNo=277446 실제 제목 (운영 로그 2026-11-05 12:00 발췌) — 200자를 넘는다. */
    private static final String MULTILINGUAL_TITLE =
            "[기숙사운영센터] 2026학년도 동계방학 기숙사(K,A관) 모집공고 2026年寒假宿舍(K馆/A馆)申请公告 "
            + "Notice of Application for Winter Session Dormitory (K Hall / A Hall) in 2026 "
            + "THÔNG BÁO TUYỂN SINH KÝ TÚC XÁ HỌC KỲ NGHỈ ĐÔNG NĂM HỌC 2026 (TÒA K / TÒA A)";

    private static CrawledNotice.CrawledNoticeBuilder base() {
        return CrawledNotice.builder()
                .articleNo("277446")
                .category("공지")
                .title("제목")
                .department("기숙사운영센터")
                .postedAt("2026-11-04")
                .url("https://www.catholic.ac.kr/notice/277446")
                .imageUrls(List.of())
                .sourceType("MAIN");
    }

    private static int codePoints(String s) {
        return s.codePointCount(0, s.length());
    }

    @Test
    @DisplayName("200자를 넘던 다국어 제목(277446)이 절단 없이 원문 그대로 저장된다")
    void keepsRealMultilingualTitleIntact() {
        assertThat(codePoints(MULTILINGUAL_TITLE)).isGreaterThan(200);

        Notice notice = Notice.from(base().title(MULTILINGUAL_TITLE).build());

        assertThat(notice.getTitle()).isEqualTo(MULTILINGUAL_TITLE);
    }

    @Test
    @DisplayName("컬럼 한도(500자)를 넘는 제목은 안전망으로 절단되고 말줄임표로 끝난다")
    void truncatesTitleOverColumnLimit() {
        String tooLong = MULTILINGUAL_TITLE.repeat(3);
        assertThat(codePoints(tooLong)).isGreaterThan(Notice.TITLE_MAX);

        Notice notice = Notice.from(base().title(tooLong).build());

        assertThat(codePoints(notice.getTitle())).isEqualTo(Notice.TITLE_MAX);
        assertThat(notice.getTitle()).startsWith("[기숙사운영센터]").endsWith("…");
    }

    @Test
    @DisplayName("한도 이내 제목은 그대로 둔다")
    void keepsShortTitle() {
        assertThat(Notice.from(base().build()).getTitle()).isEqualTo("제목");
    }

    @Test
    @DisplayName("category·department도 같은 방식으로 보정한다")
    void truncatesCategoryAndDepartment() {
        Notice notice = Notice.from(base()
                .category("가".repeat(Notice.CATEGORY_MAX + 5))
                .department("나".repeat(Notice.DEPARTMENT_MAX + 5))
                .build());

        assertThat(codePoints(notice.getCategory())).isEqualTo(Notice.CATEGORY_MAX);
        assertThat(codePoints(notice.getDepartment())).isEqualTo(Notice.DEPARTMENT_MAX);
    }

    @Test
    @DisplayName("서로게이트 쌍(이모지)을 반으로 쪼개지 않는다")
    void doesNotSplitSurrogatePair() {
        String emojis = "😀".repeat(Notice.TITLE_MAX + 1);   // UTF-16 길이는 2배

        String title = Notice.from(base().title(emojis).build()).getTitle();

        assertThat(codePoints(title)).isEqualTo(Notice.TITLE_MAX);
        assertThat(title.codePoints().noneMatch(cp -> cp >= Character.MIN_SURROGATE && cp <= Character.MAX_SURROGATE)).isTrue();   // 외톨이 서로게이트 없음
    }

    @Test
    @DisplayName("절단하면 의미가 깨지는 url·articleNo가 한도를 넘으면 저장 불가로 판정한다")
    void rejectsOverlongIdentifiers() {
        assertThat(Notice.isStorable(base().build())).isTrue();
        assertThat(Notice.isStorable(base().url("https://x/" + "a".repeat(Notice.URL_MAX)).build())).isFalse();
        assertThat(Notice.isStorable(base().articleNo("1".repeat(Notice.ARTICLE_NO_MAX + 1)).build())).isFalse();
    }

    @Test
    @DisplayName("정확히 한도인 값은 절단하지 않는다")
    void keepsValueAtBoundary() {
        String exact = "가".repeat(Notice.TITLE_MAX);

        assertThat(Notice.from(base().title(exact).build()).getTitle()).isEqualTo(exact);
        assertThat(Notice.isStorable(base()
                .url("u".repeat(Notice.URL_MAX))
                .articleNo("1".repeat(Notice.ARTICLE_NO_MAX))
                .build())).isTrue();
    }

    @Test
    @DisplayName("NOT NULL 필드가 비면 저장 불가로 판정한다 — 배치 롤백 방지")
    void rejectsMissingRequiredFields() {
        assertThat(Notice.isStorable(base().articleNo(null).build())).isFalse();
        assertThat(Notice.isStorable(base().url(null).build())).isFalse();
        assertThat(Notice.isStorable(base().title(null).build())).isFalse();
        assertThat(Notice.isStorable(base().category(null).build())).isFalse();
        assertThat(Notice.isStorable(base().department(null).build())).isFalse();
    }
}
