package org.cathori.backend.notice.application;

import lombok.RequiredArgsConstructor;
import org.cathori.backend.common.exception.BusinessException;
import org.cathori.backend.notice.api.dto.NoticeFeedItem;
import org.cathori.backend.notice.api.dto.NoticeFeedResponse;
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
                .map(r -> toItem(r, today))
                .toList();

        return new NoticeFeedResponse(content, page, size, hasNext);
    }

    /**
     * {@code ChronoUnit.DAYS.between(today, deadlineAt)} 기준으로 dDay를 계산한다.
     * 양수 = 마감까지 남은 일수, 음수 = 마감 초과, null = 마감일 없는 공지.
     */
    private NoticeFeedItem toItem(NoticeRow row, LocalDate today) {
        Integer dDay = row.deadlineAt() != null
                ? (int) ChronoUnit.DAYS.between(today, row.deadlineAt())
                : null;
        return new NoticeFeedItem(
                row.id(), row.category(), row.title(), row.department(),
                row.postedAt(), row.aiSummary(), row.url(), dDay, row.isBookmarked()
        );
    }
}
