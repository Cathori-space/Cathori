package org.cathori.backend.notice.model;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.cathori.backend.notice.application.crawling.CrawledNotice;
import org.cathori.backend.notice.application.AiSummaryResult;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 컬럼 길이 정본 — {@code @Column(length)}와 수집 시 보정 기준이 같은 값을 본다. */
    public static final int ARTICLE_NO_MAX = 20;
    public static final int CATEGORY_MAX = 20;
    public static final int TITLE_MAX = 200;
    public static final int DEPARTMENT_MAX = 30;
    public static final int URL_MAX = 500;

    private static final String ELLIPSIS = "…";
    private static final int ELLIPSIS_CODE_POINTS = ELLIPSIS.codePointCount(0, ELLIPSIS.length());

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = ARTICLE_NO_MAX)
    private String articleNo;

    @Column(nullable = false, length = 20)
    private String sourceType;

    @Column(length = 20)
    private String sourceId;

    @Column(nullable = false, length = CATEGORY_MAX)
    private String category;

    @Column(nullable = false, length = TITLE_MAX)
    private String title;

    @Column(columnDefinition = "text")
    private String bodyText;

    @Column(columnDefinition = "text")
    private String imageUrlsJson;

    @Column(columnDefinition = "text")
    private String aiSummary;

    @Column(nullable = false, length = 20)
    private String aiSummaryStatus = "PENDING";

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int aiSummaryRetryCount = 0;

    @Column(nullable = false, length = DEPARTMENT_MAX)
    private String department;

    @Column(nullable = false)
    private LocalDate postedAt;

    @Column
    private LocalDate deadlineAt;

    @Column(nullable = false, length = URL_MAX)
    private String url;

    @Column(nullable = false)
    private Long viewCount = 0L;

    @Column(name = "alert_dispatched", nullable = false)
    private boolean alertDispatched = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void markAlertDispatched() {
        this.alertDispatched = true;
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public List<String> getImageUrls() {
        if (imageUrlsJson == null || imageUrlsJson.isBlank()) return List.of();
        try {
            return List.of(MAPPER.readValue(imageUrlsJson, String[].class));
        } catch (JacksonException e) {
            return List.of();
        }
    }

    public void applySummary(AiSummaryResult result) {
        try {
            this.aiSummary = MAPPER.writeValueAsString(result.summary());
        } catch (JacksonException e) {
            this.aiSummary = "[]";
        }
        if (result.deadline() != null && !result.deadline().equals("null")) {
            try {
                this.deadlineAt = LocalDate.parse(result.deadline());
            } catch (DateTimeParseException ignored) {}
        }
        this.aiSummaryStatus = "SUCCESS";
    }

    public void markSummaryFailed() {
        this.aiSummaryStatus = "FAILED";
    }

    public void recordSummaryRetryAttempt() {
        this.aiSummaryRetryCount++;
    }

    /**
     * 저장 가능한 공지인지. NOT NULL 필드가 비었거나, 절단하면 의미가 깨지는 필드(식별자·링크)가
     * 컬럼 한도를 넘으면 false — 저장 대상에서 제외해야 한다. 한 건 때문에 소스 배치 전체가 롤백되지 않도록.
     */
    public static boolean isStorable(CrawledNotice crawled) {
        if (crawled.articleNo() == null || crawled.url() == null || crawled.title() == null
                || crawled.category() == null || crawled.department() == null) {
            return false;
        }
        return fits(crawled.articleNo(), ARTICLE_NO_MAX) && fits(crawled.url(), URL_MAX);
    }

    /**
     * 수집 공지를 엔티티로 변환한다. 표시용 필드(title·category·department)는
     * 컬럼 한도를 넘으면 말줄임표로 절단한다 — 외부 사이트 입력은 길이를 신뢰할 수 없다.
     */
    public static Notice from(CrawledNotice crawled) {
        Notice notice = new Notice();
        notice.articleNo = crawled.articleNo();
        notice.sourceType = crawled.sourceType();
        notice.sourceId = crawled.sourceId();
        notice.category = truncate(crawled.category(), CATEGORY_MAX);
        notice.title = truncate(crawled.title(), TITLE_MAX);
        notice.department = truncate(crawled.department(), DEPARTMENT_MAX);
        notice.postedAt = LocalDate.parse(crawled.postedAt());
        notice.url = crawled.url();
        notice.bodyText = crawled.bodyText();
        try {
            notice.imageUrlsJson = MAPPER.writeValueAsString(crawled.imageUrls());
        } catch (JacksonException e) {
            notice.imageUrlsJson = "[]";
        }
        notice.aiSummaryStatus = "PENDING";
        notice.viewCount = 0L;
        return notice;
    }

    static int codePoints(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }

    private static boolean fits(String value, int max) {
        return codePoints(value) <= max;
    }

    /** PostgreSQL varchar(n)은 문자(code point) 단위 — 서로게이트 쌍을 쪼개지 않도록 code point로 자른다. */
    static String truncate(String value, int max) {
        if (max <= ELLIPSIS_CODE_POINTS) throw new IllegalArgumentException("max가 말줄임표보다 짧다: " + max);
        if (fits(value, max)) return value;
        int end = value.offsetByCodePoints(0, max - ELLIPSIS_CODE_POINTS);
        return value.substring(0, end) + ELLIPSIS;
    }
}
