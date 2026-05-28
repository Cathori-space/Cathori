package org.cathori.backend.notice.application;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.bookmark.infra.BookmarkJpaRepository;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.tag.domain.Tag;
import org.cathori.backend.tag.domain.TagRepository;
import org.cathori.backend.notice.api.dto.NoticeFeedItem;
import org.cathori.backend.notice.api.dto.NoticeFeedResponse;
import org.cathori.backend.notice.api.dto.NoticeDetailResponse;
import org.cathori.backend.notice.api.dto.NoticeSearchItem;
import org.cathori.backend.notice.api.dto.NoticeSearchResponse;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.user.UserErrorCode;
import org.cathori.backend.user.domain.User;
import org.cathori.backend.user.domain.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NoticeFeedService {

    private final NoticeFeedPort noticeFeedPort;
    private final UserRepository userRepository;
    private final NoticeRepository noticeRepository;
    private final BookmarkJpaRepository bookmarkJpaRepository;
    private final TagRepository tagRepository;

    /**
     * 사용자의 전공·복수전공을 자동으로 주입해 개인화된 공지 피드를 구성하는 메인 유스케이스.
     * 호출자는 userId만 넘기면 되고, 전공 기반 필터링은 서비스 내부에서 처리된다.
     * <p>
     * hasNext 판정은 인프라에서 size+1 건을 가져온 뒤 초과 여부로 결정하므로,
     * 포트 구현체는 반드시 {@code query.size() + 1} 만큼 조회해야 한다.
     */
    @Transactional(readOnly = true)
    public NoticeFeedResponse getFeed(Long userId, String category, String tags, int page, int size) {

        // 1. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 2. tags 문자열 파싱
        List<String> tagList = (tags == null || tags.isBlank())
                ? List.of()
                : Arrays.stream(tags.split(","))
                        .map(String::trim)
                        .filter(t -> !t.isBlank())
                        .toList();

        // 3. 쿼리 객체 생성 + 포트 위임
        NoticeFeedQuery query = new NoticeFeedQuery(
                userId, user.getMajor(), user.getSecondMajor(),
                category, tagList, page, size
        );

        List<NoticeRow> rows = noticeFeedPort.findFeed(query);

        // 4. hasNext 판정
        boolean hasNext = rows.size() > size;
        List<NoticeRow> pageRows = hasNext ? rows.subList(0, size) : rows;


        // 5. DTO 매핑 + 반환
        LocalDate today = LocalDate.now();
        List<NoticeFeedItem> content = pageRows.stream()
                .map(r -> toItem(r, today, tagList))
                .toList();

        return new NoticeFeedResponse(content, page, size, hasNext);
    }

    @Transactional(readOnly = true)
    public NoticeSearchResponse search(Long userId, String keyword, int page, int size) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        NoticeSearchQuery query = new NoticeSearchQuery(
                userId, keyword, user.getMajor(), user.getSecondMajor(), page, size
        );

        List<NoticeSearchRow> rows = noticeFeedPort.findSearch(query);

        boolean hasNext = rows.size() > size;
        List<NoticeSearchRow> pageRows = hasNext ? rows.subList(0, size) : rows;

        LocalDate today = LocalDate.now();
        List<NoticeSearchItem> content = pageRows.stream()
                .map(r -> toSearchItem(r, today))
                .toList();

        return new NoticeSearchResponse(content, page, size, hasNext);
    }

    private NoticeSearchItem toSearchItem(NoticeSearchRow row, LocalDate today) {
        Integer dDay = row.deadlineAt() != null
                ? (int) ChronoUnit.DAYS.between(today, row.deadlineAt())
                : null;
        return new NoticeSearchItem(
                String.valueOf(row.id()), row.category(), row.title(), row.department(), row.postedAt(), dDay
        );
    }

    @Transactional
    public NoticeDetailResponse getDetail(Long userId, Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new BusinessException(NoticeErrorCode.NOTICE_NOT_FOUND));

        noticeRepository.incrementViewCount(noticeId);

        boolean isBookmarked = bookmarkJpaRepository.existsByUserIdAndNoticeId(userId, noticeId);

        List<String> tags = tagRepository.findAllByUserId(userId).stream()
                .map(Tag::getName)
                .filter(t -> notice.getTitle().contains(t))
                .toList();

        return toDetail(notice, isBookmarked, tags);
    }

    private NoticeDetailResponse toDetail(Notice notice, boolean isBookmarked, List<String> tags) {
        String aiSummary = "SUCCESS".equals(notice.getAiSummaryStatus()) ? notice.getAiSummary() : null;
        String category = "DEPARTMENT".equals(notice.getSourceType()) ? null : notice.getCategory();
        Integer dDay = notice.getDeadlineAt() != null
                ? (int) ChronoUnit.DAYS.between(LocalDate.now(), notice.getDeadlineAt())
                : null;
        String deadlineAt = notice.getDeadlineAt() != null ? notice.getDeadlineAt().toString() : null;
        return new NoticeDetailResponse(
                String.valueOf(notice.getId()), category, notice.getTitle(), notice.getDepartment(),
                notice.getPostedAt(), aiSummary, notice.getAiSummaryStatus(),
                notice.getUrl(), isBookmarked, dDay, notice.getViewCount(), tags, deadlineAt
        );
    }

    /**
     * {@code ChronoUnit.DAYS.between(today, deadlineAt)} 기준으로 dDay를 계산한다.
     * 양수 = 마감까지 남은 일수, 음수 = 마감 초과, null = 마감일 없는 공지.
     */
    private NoticeFeedItem toItem(NoticeRow row, LocalDate today, List<String> queryTags) {
        Integer dDay = row.deadlineAt() != null
                ? (int) ChronoUnit.DAYS.between(today, row.deadlineAt())
                : null;
        String category = "DEPARTMENT".equals(row.sourceType()) ? null : row.category();
        String deadlineAt = row.deadlineAt() != null ? row.deadlineAt().toString() : null;
        List<String> tags = queryTags.stream()
                .filter(t -> row.title().contains(t))
                .toList();
        return new NoticeFeedItem(
                String.valueOf(row.id()), category, row.title(), row.department(),
                row.postedAt(), row.aiSummary(), row.aiSummaryStatus(), row.url(), dDay, row.viewCount(), row.isBookmarked(), tags, deadlineAt
        );
    }
}
