package org.cathori.backend.notice.infra;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** 공개 데이터 조회는 필터링과 페이지네이션에 앞서 항상 MAIN 조건을 적용한다. */
@Repository
@RequiredArgsConstructor
public class PublicNoticeQueryRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final String PUBLIC_COLUMNS = """
            SELECT id, category, title, department, posted_at, deadline_at,
                   ai_summary, ai_summary_status, url, view_count
            FROM notices WHERE source_type = 'MAIN'
            """;
    private static final String ORDER_AND_PAGE =
            " ORDER BY posted_at DESC, title ASC, id DESC LIMIT ? OFFSET ?";

    private static final RowMapper<PublicNoticeRow> ROW_MAPPER = (rs, rowNum) -> new PublicNoticeRow(
            rs.getLong("id"), rs.getString("category"), rs.getString("title"),
            rs.getString("department"), rs.getObject("posted_at", LocalDate.class),
            rs.getObject("deadline_at", LocalDate.class), rs.getString("ai_summary"),
            rs.getString("ai_summary_status"), rs.getString("url"), rs.getLong("view_count")
    );

    public List<PublicNoticeRow> findFeed(String category, int page, int size) {
        long offset = (long) page * size;
        if (category == null) {
            return jdbcTemplate.query(PUBLIC_COLUMNS + ORDER_AND_PAGE, ROW_MAPPER, size + 1, offset);
        }
        return jdbcTemplate.query(PUBLIC_COLUMNS + " AND category = ?" + ORDER_AND_PAGE,
                ROW_MAPPER, category, size + 1, offset);
    }

    public List<PublicNoticeSearchRow> findSearch(String keyword, int page, int size) {
        // LIKE 검색의 이스케이프 문자로 !를 사용하며, ! 자체도 이스케이프 처리한다.
        String pattern = "%" + keyword.replace("!", "!!").replace("%", "!%")
                .replace("_", "!_") + "%";
        String sql = """
                SELECT id, category, title, department, posted_at, deadline_at
                FROM notices WHERE source_type = 'MAIN' AND title LIKE ? ESCAPE '!'
                """ + ORDER_AND_PAGE;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new PublicNoticeSearchRow(
                rs.getLong("id"), rs.getString("category"), rs.getString("title"),
                rs.getString("department"), rs.getObject("posted_at", LocalDate.class),
                rs.getObject("deadline_at", LocalDate.class)
        ), pattern, size + 1, (long) page * size);
    }

    /** 403과 404를 구분하기 위해 MAIN 외 공지는 출처 정보만 조회할 수 있다. */
    public Optional<String> findSourceType(Long noticeId) {
        return jdbcTemplate.query("SELECT source_type FROM notices WHERE id = ?",
                (rs, rowNum) -> rs.getString("source_type"), noticeId).stream().findFirst();
    }

    public Optional<PublicNoticeRow> findMainDetail(Long noticeId) {
        return jdbcTemplate.query(PUBLIC_COLUMNS + " AND id = ?", ROW_MAPPER, noticeId)
                .stream().findFirst();
    }

    public record PublicNoticeRow(
            Long id, String category, String title, String department, LocalDate postedAt,
            LocalDate deadlineAt, String aiSummary, String aiSummaryStatus, String url, Long viewCount
    ) {}

    public record PublicNoticeSearchRow(
            Long id, String category, String title, String department, LocalDate postedAt,
            LocalDate deadlineAt
    ) {}
}
