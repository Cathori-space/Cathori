package org.cathori.backend.notice.infra;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.notice.application.AiSummaryResult;
import org.cathori.backend.notice.application.crawling.CrawledNotice;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.application.NotificationPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class PublicNoticeQueryRepositoryTest extends IntegrationTestBase {

    @Autowired PublicNoticeQueryRepository repository;
    @Autowired NoticeRepository notices;
    @MockitoBean NotificationPort notificationPort;

    @Test
    void feedFiltersMainBeforePagingAndReturnsOnlyOneLookaheadRow() {
        save("PRIVATE", "A", "장학", LocalDate.of(2026, 11, 5));
        save("DEPARTMENT", "B", "장학", LocalDate.of(2026, 11, 5));
        Notice older = save("MAIN", "A", "장학", LocalDate.of(2026, 11, 3));
        Notice second = save("MAIN", "B", "장학", LocalDate.of(2026, 11, 4));
        Notice first = save("MAIN", "A", "장학", LocalDate.of(2026, 11, 4));

        assertThat(repository.findFeed(null, 0, 1)).extracting(PublicNoticeQueryRepository.PublicNoticeRow::id)
                .containsExactly(first.getId(), second.getId());
        assertThat(repository.findFeed(null, 1, 1)).extracting(PublicNoticeQueryRepository.PublicNoticeRow::id)
                .containsExactly(second.getId(), older.getId());
        assertThat(repository.findFeed(null, 2, 1)).extracting(PublicNoticeQueryRepository.PublicNoticeRow::id)
                .containsExactly(older.getId());
    }

    @Test
    void categoryDoesNotExposeMatchingPrivateSources() {
        Notice main = save("MAIN", "장학 공지", "장학", LocalDate.now());
        save("MAIN", "학사 공지", "학사", LocalDate.now());
        save("DEPARTMENT", "장학 공지", "장학", LocalDate.now());
        save("FUTURE_SOURCE", "장학 공지", "장학", LocalDate.now());
        assertThat(repository.findFeed("장학", 0, 20)).extracting(PublicNoticeQueryRepository.PublicNoticeRow::id)
                .containsExactly(main.getId());
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "_", "!", "\\", "' OR 1=1 --", "장학"})
    void searchBindsKeywordsAndTreatsWildcardsAndEscapeCharactersLiterally(String keyword) {
        Notice match = save("MAIN", "앞 " + keyword + " 뒤", "일반", LocalDate.now());
        save("MAIN", "다른 공지", "일반", LocalDate.now());
        save("DEPARTMENT", "앞 " + keyword + " 뒤", "일반", LocalDate.now());
        save("PRIVATE", "앞 " + keyword + " 뒤", "일반", LocalDate.now());

        assertThat(repository.findSearch(keyword, 0, 20))
                .extracting(PublicNoticeQueryRepository.PublicNoticeSearchRow::id)
                .containsExactly(match.getId());
    }

    @Test
    void equalDateAndTitleHaveStableIdOrderingForFeedAndSearch() {
        Notice olderId = save("MAIN", "같은 공지", "일반", LocalDate.now());
        Notice newerId = save("MAIN", "같은 공지", "일반", LocalDate.now());
        assertThat(repository.findFeed(null, 0, 20)).extracting(PublicNoticeQueryRepository.PublicNoticeRow::id)
                .containsExactly(newerId.getId(), olderId.getId());
        assertThat(repository.findSearch("공지", 0, 20))
                .extracting(PublicNoticeQueryRepository.PublicNoticeSearchRow::id)
                .containsExactly(newerId.getId(), olderId.getId());
    }

    @Test
    void searchPaginatesMainMatchesAndNotPrivateMatches() {
        save("PRIVATE", "A 공지", "일반", LocalDate.now());
        Notice first = save("MAIN", "B 공지", "일반", LocalDate.now());
        Notice second = save("MAIN", "C 공지", "일반", LocalDate.now());
        Notice third = save("MAIN", "D 공지", "일반", LocalDate.now());
        assertThat(repository.findSearch("공지", 0, 1))
                .extracting(PublicNoticeQueryRepository.PublicNoticeSearchRow::id)
                .containsExactly(first.getId(), second.getId());
        assertThat(repository.findSearch("공지", 1, 1))
                .extracting(PublicNoticeQueryRepository.PublicNoticeSearchRow::id)
                .containsExactly(second.getId(), third.getId());
        assertThat(repository.findSearch("공지", 3, 1)).isEmpty();
    }

    @Test
    void detailProjectionContainsStoredPublicFieldsOnlyForMain() {
        Notice main = save("MAIN", "공통 공지", "장학", LocalDate.of(2026, 11, 4));
        main.applySummary(new AiSummaryResult(List.of("저장된 요약"), "2026-11-10"));
        main.increaseViewCount();
        notices.saveAndFlush(main);

        var row = repository.findMainDetail(main.getId()).orElseThrow();
        assertThat(row.id()).isEqualTo(main.getId());
        assertThat(row.category()).isEqualTo("장학");
        assertThat(row.postedAt()).isEqualTo(LocalDate.of(2026, 11, 4));
        assertThat(row.deadlineAt()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(row.aiSummary()).contains("저장된 요약");
        assertThat(row.aiSummaryStatus()).isEqualTo("SUCCESS");
        assertThat(row.url()).isEqualTo("https://example.edu/notice");
        assertThat(row.viewCount()).isEqualTo(1L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DEPARTMENT", "PRIVATE", "FUTURE_SOURCE"})
    void metadataCanIdentifyNonMainButDetailQueryNeverLoadsIt(String source) {
        Notice notice = save(source, "비공개 제목", "일반", LocalDate.now());
        assertThat(repository.findSourceType(notice.getId())).contains(source);
        assertThat(repository.findMainDetail(notice.getId())).isEmpty();
    }

    @Test
    void missingIdHasNeitherMetadataNorDetail() {
        assertThat(repository.findSourceType(Long.MAX_VALUE)).isEmpty();
        assertThat(repository.findMainDetail(Long.MAX_VALUE)).isEmpty();
    }

    private Notice save(String source, String title, String category, LocalDate date) {
        return notices.saveAndFlush(Notice.from(CrawledNotice.builder()
                .articleNo(UUID.randomUUID().toString().substring(0, 10))
                .sourceType(source).sourceId("MAIN".equals(source) ? null : "CSIE")
                .category(category).title(title).department("학생처").postedAt(date.toString())
                .url("https://example.edu/notice").bodyText("원문").imageUrls(List.of()).build()));
    }
}
