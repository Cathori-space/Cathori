package org.cathori.backend.notice.application.query;

import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.notice.application.NoticeErrorCode;
import org.cathori.backend.notice.infra.PublicNoticeQueryRepository;
import org.cathori.backend.notice.infra.PublicNoticeQueryRepository.PublicNoticeRow;
import org.cathori.backend.notice.infra.PublicNoticeQueryRepository.PublicNoticeSearchRow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicNoticeServiceTest {

    @Mock PublicNoticeQueryRepository repository;
    @InjectMocks PublicNoticeService service;

    @Test
    void feedMapsStoredSummaryAndLimitsContentBeforeHasNext() {
        when(repository.findFeed(null, 0, 1)).thenReturn(List.of(row("SUCCESS"), row("PENDING")));

        var response = service.getFeed(null, 0, 1);

        assertThat(response.hasNext()).isTrue();
        assertThat(response.content()).hasSize(1);
        var item = response.content().getFirst();
        assertThat(item.noticeId()).isEqualTo("1");
        assertThat(item.aiSummary()).isEqualTo("[\"stored summary\"]");
        assertThat(item.viewCount()).isEqualTo(7L);
        assertThat(item.deadlineAt()).isEqualTo("2026-11-10");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void feedEmptyPageHasNoNext() {
        when(repository.findFeed("장학", 2, 20)).thenReturn(List.of());
        var response = service.getFeed("장학", 2, 20);
        assertThat(response.content()).isEmpty();
        assertThat(response.page()).isEqualTo(2);
        assertThat(response.size()).isEqualTo(20);
        assertThat(response.hasNext()).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "FAILED", "SKIPPED", "UNKNOWN"})
    void summaryBodyIsHiddenUnlessSuccessful(String status) {
        when(repository.findFeed(null, 0, 20)).thenReturn(List.of(row(status)));
        when(repository.findSourceType(1L)).thenReturn(Optional.of("MAIN"));
        when(repository.findMainDetail(1L)).thenReturn(Optional.of(row(status)));

        assertThat(service.getFeed(null, 0, 20).content().getFirst().aiSummary()).isNull();
        assertThat(service.getDetail(1L).aiSummary()).isNull();
    }

    @Test
    void detailReturnsStoredPublicDataWithoutWrites() {
        when(repository.findSourceType(1L)).thenReturn(Optional.of("MAIN"));
        when(repository.findMainDetail(1L)).thenReturn(Optional.of(row("SUCCESS")));

        var detail = service.getDetail(1L);

        assertThat(detail.aiSummary()).isEqualTo("[\"stored summary\"]");
        assertThat(detail.viewCount()).isEqualTo(7L);
        verify(repository).findSourceType(1L);
        verify(repository).findMainDetail(1L);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"DEPARTMENT", "PRIVATE", "FUTURE_SOURCE"})
    void nonMainDetailNeverLoadsFullData(String sourceType) {
        when(repository.findSourceType(1L)).thenReturn(Optional.of(sourceType));

        assertThatThrownBy(() -> service.getDetail(1L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(NoticeErrorCode.NOTICE_ACCESS_DENIED));
        verify(repository, never()).findMainDetail(anyLong());
    }

    @Test
    void missingDetailReturnsNotFoundWithoutLoadingData() {
        when(repository.findSourceType(1L)).thenReturn(Optional.empty());
        assertNotFound();
        verify(repository, never()).findMainDetail(anyLong());
    }

    @Test
    void detailDisappearingBetweenQueriesDoesNotReturnUnrestrictedData() {
        when(repository.findSourceType(1L)).thenReturn(Optional.of("MAIN"));
        when(repository.findMainDetail(1L)).thenReturn(Optional.empty());
        assertNotFound();
    }

    @Test
    void searchTrimsKeywordAndLimitsPage() {
        var row = new PublicNoticeSearchRow(1L, "장학", "100%_!", "학생처", LocalDate.now(), null);
        when(repository.findSearch("100%_!", 0, 1)).thenReturn(List.of(row, row));

        var response = service.search("  100%_!  ", 0, 1);

        assertThat(response.content()).hasSize(1);
        assertThat(response.hasNext()).isTrue();
        assertThat(response.content().getFirst().deadlineAt()).isNull();
    }

    @Test
    void searchAcceptsOneHundredCharactersAfterTrimming() {
        String keyword = "가".repeat(100);
        when(repository.findSearch(keyword, 0, 10)).thenReturn(List.of());
        assertThat(service.search(" " + keyword + " ", 0, 10).hasNext()).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n", "\u2003"})
    void blankSearchIsRejected(String keyword) {
        assertInvalid(() -> service.search(keyword, 0, 10));
        verifyNoInteractions(repository);
    }

    @Test
    void longSearchIsRejected() {
        assertInvalid(() -> service.search("가".repeat(101), 0, 10));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "학과공지", "취업", "MAIN"})
    void invalidCategoryIsRejected(String category) {
        assertInvalid(() -> service.getFeed(category, 0, 20));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @CsvSource({"-1,20", "0,0", "0,-1", "0,51"})
    void invalidPaginationIsRejectedForFeedAndSearch(int page, int size) {
        assertInvalid(() -> service.getFeed(null, page, size));
        assertInvalid(() -> service.search("공지", page, size));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1})
    void nonPositiveIdIsRejected(long id) {
        assertInvalid(() -> service.getDetail(id));
        verifyNoInteractions(repository);
    }

    private void assertInvalid(Runnable request) {
        assertThatThrownBy(request::run).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(NoticeErrorCode.PUBLIC_NOTICE_INVALID_INPUT));
    }

    private void assertNotFound() {
        assertThatThrownBy(() -> service.getDetail(1L)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(NoticeErrorCode.NOTICE_NOT_FOUND));
    }

    private PublicNoticeRow row(String status) {
        return new PublicNoticeRow(1L, "장학", "공지", "학생처", LocalDate.of(2026, 11, 4),
                LocalDate.of(2026, 11, 10), "[\"stored summary\"]", status, "https://example.edu/notice", 7L);
    }
}
