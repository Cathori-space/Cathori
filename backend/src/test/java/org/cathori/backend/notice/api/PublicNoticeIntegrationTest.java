package org.cathori.backend.notice.api;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.bookmark.domain.Bookmark;
import org.cathori.backend.bookmark.infra.BookmarkJpaRepository;
import org.cathori.backend.notice.application.AiPort;
import org.cathori.backend.notice.application.AiSummaryResult;
import org.cathori.backend.notice.application.crawling.CrawledNotice;
import org.cathori.backend.notice.model.Notice;
import org.cathori.backend.notice.model.NoticeRepository;
import org.cathori.backend.security.JwtUtil;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.application.AuthService;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.application.VerifiedEmailStore;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class PublicNoticeIntegrationTest extends IntegrationTestBase {

    private static final String BASE = "/api/public/notices";
    @Autowired MockMvc mockMvc;
    @Autowired NoticeRepository notices;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired AuthService authService;
    @Autowired VerifiedEmailStore verifiedEmails;
    @Autowired UserJpaRepository users;
    @Autowired BookmarkJpaRepository bookmarks;
    @Autowired JwtUtil jwtUtil;
    @Value("${jwt.secret-key}") String signingKey;
    @MockitoBean NotificationPort notificationPort;
    @MockitoBean AiPort aiPort;

    @AfterEach
    void noAiGenerationOrEmailSending() {
        verifyNoInteractions(aiPort, notificationPort);
    }

    @Test
    void anonymousFeedAndSearchOnlyExposeMainAndPublicFields() throws Exception {
        Notice main = save("MAIN", "공통 공지", "장학");
        save("DEPARTMENT", "학과 공지", "장학");
        save("PRIVATE", "비공개 공지", "장학");

        ResultActions feed = mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].noticeId").value(main.getId().toString()))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.hasNext").value(false));
        noPersonalFields(feed);

        ResultActions search = mockMvc.perform(get(BASE + "/search").param("q", " 공지 "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].noticeId").value(main.getId().toString()))
                .andExpect(jsonPath("$.size").value(10));
        noPersonalFields(search);
        search.andExpect(jsonPath("$.content[0].aiSummary").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"일반", "장학", "학사", "취창업"})
    void categoryOnlyFiltersMain(String category) throws Exception {
        save("MAIN", "대상 공지", category);
        save("MAIN", "다른 카테고리", "기타");
        save("DEPARTMENT", "학과 공지", category);
        mockMvc.perform(get(BASE).param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("대상 공지"));
    }

    @Test
    void paginationAndHasNextAreCalculatedAfterMainRestriction() throws Exception {
        save("PRIVATE", "A 공지", "일반");
        save("DEPARTMENT", "B 공지", "일반");
        Notice first = save("MAIN", "C 공지", "일반");
        Notice second = save("MAIN", "D 공지", "일반");
        for (String path : List.of(BASE, BASE + "/search")) {
            mockMvc.perform(get(path).param("q", "공지").param("size", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].noticeId").value(first.getId().toString()))
                    .andExpect(jsonPath("$.hasNext").value(true));
            mockMvc.perform(get(path).param("q", "공지").param("size", "1").param("page", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].noticeId").value(second.getId().toString()))
                    .andExpect(jsonPath("$.hasNext").value(false));
            mockMvc.perform(get(path).param("q", "공지").param("size", "1").param("page", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", empty()))
                    .andExpect(jsonPath("$.hasNext").value(false));
        }
    }

    @Test
    void anonymousDetailReturnsStoredSummaryAndDoesNotChangeViews() throws Exception {
        Notice notice = save("MAIN", "공통 공지", "장학");
        notice.applySummary(new AiSummaryResult(List.of("첫 줄", "둘째 줄", "셋째 줄"), "2026-11-10"));
        notice.increaseViewCount();
        notices.saveAndFlush(notice);
        long before = notice.getViewCount();

        for (int i = 0; i < 2; i++) {
            ResultActions result = mockMvc.perform(get(BASE + "/" + notice.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.aiSummaryStatus").value("SUCCESS"))
                    .andExpect(jsonPath("$.aiSummary").isNotEmpty())
                    .andExpect(jsonPath("$.url").value("https://example.edu/notice"))
                    .andExpect(jsonPath("$.deadlineAt").value("2026-11-10"))
                    .andExpect(jsonPath("$.viewCount").value(before));
            noPersonalFields(result);
        }
        assertThat(jdbcTemplate.queryForObject("SELECT view_count FROM notices WHERE id = ?",
                Long.class, notice.getId())).isEqualTo(before);
    }

    @Test
    void unsuccessfulSummaryBodyIsNotExposed() throws Exception {
        Notice notice = save("MAIN", "공통 공지", "일반");
        notice.applySummary(new AiSummaryResult(List.of("stale summary"), null));
        notice.markSummaryFailed();
        notices.saveAndFlush(notice);
        mockMvc.perform(get(BASE)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].aiSummary").value(nullValue()));
        mockMvc.perform(get(BASE + "/" + notice.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.aiSummary").value(nullValue()))
                .andExpect(jsonPath("$.aiSummaryStatus").value("FAILED"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"DEPARTMENT", "PRIVATE", "FUTURE_SOURCE"})
    void allNonMainSourcesAreForbiddenWithoutDisclosingDetails(String sourceType) throws Exception {
        Notice notice = save(sourceType, "비공개 제목", "일반");
        mockMvc.perform(get(BASE + "/" + notice.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOTICE_ACCESS_DENIED"))
                .andExpect(jsonPath("$.title").doesNotExist())
                .andExpect(jsonPath("$.aiSummary").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @Test
    void nonexistentDetailReturns404() throws Exception {
        mockMvc.perform(get(BASE + "/9223372036854775807"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "page,abc", "page,2147483648", "size,0", "size,-1", "size,51", "size,abc"})
    void invalidPaginationReturns400(String key, String value) throws Exception {
        invalid(mockMvc.perform(get(BASE).param(key, value)));
        invalid(mockMvc.perform(get(BASE + "/search").param("q", "공지").param(key, value)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "abc", "1.5", "9223372036854775808"})
    void invalidIdReturns400(String id) throws Exception {
        invalid(mockMvc.perform(get(BASE + "/" + id)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "학과공지", "취업", "MAIN"})
    void invalidCategoryReturns400(String category) throws Exception {
        invalid(mockMvc.perform(get(BASE).param("category", category)));
    }

    @Test
    void missingBlankAndLongSearchReturn400() throws Exception {
        invalid(mockMvc.perform(get(BASE + "/search")));
        for (String keyword : List.of("", " \t ", "가".repeat(101))) {
            invalid(mockMvc.perform(get(BASE + "/search").param("q", keyword)));
        }
        mockMvc.perform(get(BASE + "/search").param("q", " " + "가".repeat(100) + " "))
                .andExpect(status().isOk());
    }

    @Test
    void maximumSizeAndLargePageAreAcceptedWithoutIntegerOverflow() throws Exception {
        mockMvc.perform(get(BASE).param("size", "50").param("page", "2147483647"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void extraParametersCannotExpandPublicScope() throws Exception {
        save("MAIN", "공통 공지", "일반");
        save("DEPARTMENT", "학과 공지", "일반");
        mockMvc.perform(get(BASE).param("sourceType", "DEPARTMENT").param("sourceId", "CSIE")
                        .param("major", "CSIE").param("userId", "1").param("tags", "학과"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("공통 공지"));
        mockMvc.perform(get(BASE + "/search").param("q", "학과").param("sourceType", "DEPARTMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})
    void nonGetMethodsAreNeverPublic(String method) throws Exception {
        for (String path : List.of(BASE, BASE + "/search", BASE + "/1")) {
            mockMvc.perform(request(HttpMethod.valueOf(method), path))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void nonGetMethodsAreDeniedEvenWithMemberToken() throws Exception {
        String token = memberToken();
        for (String method : List.of("POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")) {
            for (String path : List.of(BASE, BASE + "/search", BASE + "/1")) {
                mockMvc.perform(request(HttpMethod.valueOf(method), path)
                                .header("Authorization", "Bearer " + token))
                        .andExpect(status().isForbidden());
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/notices", "/api/notices/search?q=공지", "/api/notices/1",
            "/api/notices/bookmarks", "/api/tags", "/api/notifications", "/api/notifications/unread-exists",
            "/api/public/notices/1/bookmark"})
    void protectedGetRequestsStillRequireAuthentication(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @Test
    void memberWriteRequestsStillRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/notices/1/bookmark")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tags")).andExpect(status().isUnauthorized());
        mockMvc.perform(patch("/api/notifications/1/read")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/notifications/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/users/device-token")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/device-token")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized());
    }

    @Test
    void memberJwtCannotExposePersonalizationOrNonMainDataThroughPublicApi() throws Exception {
        String token = memberToken();
        Notice main = save("MAIN", "공통 공지", "일반");
        Notice department = save("DEPARTMENT", "학과 공지", "학과공지");
        Long userId = users.findByEmail("guest-public-test@catholic.ac.kr").orElseThrow().getId();
        bookmarks.saveAndFlush(Bookmark.create(userId, main.getId()));

        noPersonalFields(mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1))));
        noPersonalFields(mockMvc.perform(get(BASE + "/search").param("q", "공지")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1))));
        noPersonalFields(mockMvc.perform(get(BASE + "/" + main.getId())
                        .header("Authorization", "Bearer " + token)).andExpect(status().isOk()));
        mockMvc.perform(get(BASE + "/" + department.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidAndExpiredJwtKeepPublicScopeWhileMemberApiReturns401() throws Exception {
        Notice main = save("MAIN", "공통 공지", "일반");
        Notice hidden = save("PRIVATE", "비공개 공지", "일반");
        String expired = Jwts.builder().subject("1").claim("type", "access")
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signingKey))).compact();
        String forged = Jwts.builder().subject("1").claim("type", "access")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(new byte[32])).compact();
        for (String token : List.of("invalid-token", expired, forged)) {
            mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1)));
            mockMvc.perform(get(BASE + "/search").param("q", "공지").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(1)));
            mockMvc.perform(get(BASE + "/" + main.getId()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
            mockMvc.perform(get(BASE + "/" + hidden.getId()).header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/notices").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void memberDetailStillIncrementsViewCountAndIncludesBookmarkState() throws Exception {
        String token = memberToken();
        Notice notice = save("MAIN", "회원 조회 공지", "일반");
        Long userId = users.findByEmail("guest-public-test@catholic.ac.kr").orElseThrow().getId();
        bookmarks.saveAndFlush(Bookmark.create(userId, notice.getId()));
        long before = notice.getViewCount();
        mockMvc.perform(get("/api/notices/" + notice.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewCount").value(before + 1))
                .andExpect(jsonPath("$.isBookmarked").value(true));
        notices.flush();
        assertThat(jdbcTemplate.queryForObject("SELECT view_count FROM notices WHERE id = ?",
                Long.class, notice.getId())).isEqualTo(before + 1);
    }

    private void invalid(ResultActions result) throws Exception {
        result.andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private void noPersonalFields(ResultActions result) throws Exception {
        for (String field : List.of("isBookmarked", "tags", "userId", "user", "major", "secondMajor",
                "accessToken", "refreshToken", "bodyText", "imageUrlsJson", "sourceType", "sourceId")) {
            result.andExpect(jsonPath("$.." + field, empty()));
        }
    }

    private String memberToken() {
        String email = "guest-public-test@catholic.ac.kr";
        verifiedEmails.markVerified(email);
        try {
            authService.register(new RegisterRequest(email, "password123!", "컴퓨터정보공학부", null, 2, "재학"));
        } finally {
            verifiedEmails.remove(email);
        }
        users.flush();
        return jwtUtil.generateAccessToken(users.findByEmail(email).orElseThrow().getId());
    }

    private Notice save(String source, String title, String category) {
        return notices.saveAndFlush(Notice.from(CrawledNotice.builder()
                .articleNo(UUID.randomUUID().toString().substring(0, 10))
                .sourceType(source).sourceId("MAIN".equals(source) ? null : "CSIE")
                .category(category).title(title).department("학생처")
                .postedAt(LocalDate.of(2026, 11, 4).toString()).url("https://example.edu/notice")
                .bodyText("비공개 원문").imageUrls(List.of()).build()));
    }
}
