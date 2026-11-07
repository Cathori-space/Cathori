package org.cathori.backend.notice.application.query;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.notice.api.dto.PublicNoticeDetailResponse;
import org.cathori.backend.notice.api.dto.PublicNoticeFeedItem;
import org.cathori.backend.notice.api.dto.PublicNoticeFeedResponse;
import org.cathori.backend.notice.api.dto.PublicNoticeSearchItem;
import org.cathori.backend.notice.api.dto.PublicNoticeSearchResponse;
import org.cathori.backend.notice.application.NoticeErrorCode;
import org.cathori.backend.notice.infra.PublicNoticeQueryRepository;
import org.cathori.backend.notice.infra.PublicNoticeQueryRepository.PublicNoticeRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicNoticeService {

    private static final Set<String> CATEGORIES = Set.of("일반", "장학", "학사", "취창업");
    private final PublicNoticeQueryRepository publicNoticeQueryRepository;

    public PublicNoticeFeedResponse getFeed(String category, int page, int size) {
        validatePage(page, size);
        if (category != null && !CATEGORIES.contains(category)) {
            throw new BusinessException(NoticeErrorCode.PUBLIC_NOTICE_INVALID_INPUT);
        }

        var rows = publicNoticeQueryRepository.findFeed(category, page, size);
        boolean hasNext = rows.size() > size;
        var content = rows.stream().limit(size).map(row -> new PublicNoticeFeedItem(
                row.id().toString(), row.category(), row.title(), row.department(), row.postedAt(),
                summary(row), row.aiSummaryStatus(), row.url(), row.viewCount(), date(row.deadlineAt())
        )).toList();
        return new PublicNoticeFeedResponse(content, page, size, hasNext);
    }

    public PublicNoticeSearchResponse search(String q, int page, int size) {
        validatePage(page, size);
        String keyword = q == null ? "" : q.strip();
        if (keyword.isBlank() || keyword.length() > 100) {
            throw new BusinessException(NoticeErrorCode.PUBLIC_NOTICE_INVALID_INPUT);
        }

        var rows = publicNoticeQueryRepository.findSearch(keyword, page, size);
        boolean hasNext = rows.size() > size;
        var content = rows.stream().limit(size).map(row -> new PublicNoticeSearchItem(
                row.id().toString(), row.category(), row.title(), row.department(), row.postedAt(),
                date(row.deadlineAt())
        )).toList();
        return new PublicNoticeSearchResponse(content, page, size, hasNext);
    }

    public PublicNoticeDetailResponse getDetail(Long noticeId) {
        if (noticeId == null || noticeId <= 0) {
            throw new BusinessException(NoticeErrorCode.PUBLIC_NOTICE_INVALID_INPUT);
        }
        String sourceType = publicNoticeQueryRepository.findSourceType(noticeId)
                .orElseThrow(() -> new BusinessException(NoticeErrorCode.NOTICE_NOT_FOUND));
        if (!"MAIN".equals(sourceType)) {
            throw new BusinessException(NoticeErrorCode.NOTICE_ACCESS_DENIED);
        }

        // 상세 데이터 조회에서도 MAIN 조건을 재확인하며, 출처 정보 확인만으로 전체 데이터 조회를 허용하지 않는다.
        PublicNoticeRow row = publicNoticeQueryRepository.findMainDetail(noticeId)
                .orElseThrow(() -> new BusinessException(NoticeErrorCode.NOTICE_NOT_FOUND));
        return new PublicNoticeDetailResponse(
                row.id().toString(), row.category(), row.title(), row.department(), row.postedAt(),
                summary(row), row.aiSummaryStatus(), row.url(), row.viewCount(), date(row.deadlineAt())
        );
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new BusinessException(NoticeErrorCode.PUBLIC_NOTICE_INVALID_INPUT);
        }
    }

    private String summary(PublicNoticeRow row) {
        return "SUCCESS".equals(row.aiSummaryStatus()) ? row.aiSummary() : null;
    }

    private String date(LocalDate value) {
        return value == null ? null : value.toString();
    }
}
