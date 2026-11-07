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
import org.cathori.backend.user.application.email.VerificationPurpose;
import org.cathori.backend.user.application.email.VerifiedEmailStore;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
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
@DisplayName("공개 공지 API 통합 테스트")
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

    @DisplayName("PN-1: 비인증 피드와 검색은 학교 공통 공지와 공개 필드만 반환한다")
    @Test
    void anonymousFeedAndSearchOnlyExposeMainAndPublicFields() throws Exception {
        // given: 공통·학과·비공개 공지를 준비
        Notice main = save("MAIN", "공통 공지", "장학");
        save("DEPARTMENT", "학과 공지", "장학");
        save("PRIVATE", "비공개 공지", "장학");

        // when & then: 공개 피드에서 공통 공지만 반환하고 회원별 필드가 없는지 확인
        ResultActions feed = mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].noticeId").value(main.getId().toString()))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.hasNext").value(false));
        noPersonalFields(feed);

        // when & then: 공백을 포함한 검색어도 공통 공지만 검색하고 요약·회원별 필드를 노출하지 않는지 확인
        ResultActions search = mockMvc.perform(get(BASE + "/search").param("q", " 공지 "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].noticeId").value(main.getId().toString()))
                .andExpect(jsonPath("$.size").value(10));
        noPersonalFields(search);
        search.andExpect(jsonPath("$.content[0].aiSummary").doesNotExist());
    }

    @DisplayName("PN-2: 카테고리로 필터링해도 학교 공통 공지만 반환한다")
    @ParameterizedTest
    @ValueSource(strings = {"일반", "장학", "학사", "취창업"})
    void categoryOnlyFiltersMain(String category) throws Exception {
        // given: 출처와 카테고리가 다른 공지를 준비
        save("MAIN", "대상 공지", category);
        save("MAIN", "다른 카테고리", "기타");
        save("DEPARTMENT", "학과 공지", category);

        // when & then: 카테고리 필터가 학과 공지를 포함시키지 않는지 확인
        mockMvc.perform(get(BASE).param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("대상 공지"));
    }

    @DisplayName("PN-3: 학교 공통 공지만을 기준으로 페이지와 다음 페이지 여부를 계산한다")
    @Test
    void paginationAndHasNextAreCalculatedAfterMainRestriction() throws Exception {
        // given: 비공개·학과 공지 뒤에 정렬될 공통 공지 두 건을 준비
        save("PRIVATE", "A 공지", "일반");
        save("DEPARTMENT", "B 공지", "일반");
        Notice first = save("MAIN", "C 공지", "일반");
        Notice second = save("MAIN", "D 공지", "일반");

        // when & then: 피드와 검색의 첫 페이지·마지막 페이지·범위 밖 페이지를 확인
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

    @DisplayName("PN-4: 공개 상세는 저장된 요약을 반환하고 조회수를 증가시키지 않는다")
    @Test
    void anonymousDetailReturnsStoredSummaryAndDoesNotChangeViews() throws Exception {
        // given: 요약과 기존 조회수가 있는 공통 공지를 준비
        Notice notice = save("MAIN", "공통 공지", "장학");
        notice.applySummary(new AiSummaryResult(List.of("첫 줄", "둘째 줄", "셋째 줄"), "2026-11-10"));
        notice.increaseViewCount();
        notices.saveAndFlush(notice);
        long before = notice.getViewCount();

        // when & then: 상세를 두 번 조회해 저장된 요약과 조회수가 유지되는지 확인
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

    @DisplayName("PN-5: 요약 생성에 실패한 공지는 기존 요약 본문을 노출하지 않는다")
    @Test
    void unsuccessfulSummaryBodyIsNotExposed() throws Exception {
        // given: 기존 요약 본문은 남아 있지만 상태는 FAILED인 공지를 준비
        Notice notice = save("MAIN", "공통 공지", "일반");
        notice.applySummary(new AiSummaryResult(List.of("stale summary"), null));
        notice.markSummaryFailed();
        notices.saveAndFlush(notice);

        // when & then: 피드와 상세 모두 실패한 요약 본문을 숨기는지 확인
        mockMvc.perform(get(BASE)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].aiSummary").value(nullValue()));
        mockMvc.perform(get(BASE + "/" + notice.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.aiSummary").value(nullValue()))
                .andExpect(jsonPath("$.aiSummaryStatus").value("FAILED"));
    }

    @DisplayName("PN-6: 학교 공통 이외 출처의 상세는 내용을 노출하지 않고 403을 반환한다")
    @ParameterizedTest
    @ValueSource(strings = {"DEPARTMENT", "PRIVATE", "FUTURE_SOURCE"})
    void allNonMainSourcesAreForbiddenWithoutDisclosingDetails(String sourceType) throws Exception {
        // given: MAIN 이외 출처의 공지를 준비
        Notice notice = save(sourceType, "비공개 제목", "일반");

        // when & then: 상세 요청이 접근 거부 코드만 반환하고 공지 내용을 숨기는지 확인
        mockMvc.perform(get(BASE + "/" + notice.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOTICE_ACCESS_DENIED"))
                .andExpect(jsonPath("$.title").doesNotExist())
                .andExpect(jsonPath("$.aiSummary").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @DisplayName("PN-7: 존재하지 않는 공지 상세는 404를 반환한다")
    @Test
    void nonexistentDetailReturns404() throws Exception {
        mockMvc.perform(get(BASE + "/9223372036854775807"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTICE_NOT_FOUND"));
    }

    @DisplayName("PN-8: 잘못된 페이지 번호와 크기는 피드와 검색에서 400을 반환한다")
    @ParameterizedTest
    @CsvSource({"page,-1", "page,abc", "page,2147483648", "size,0", "size,-1", "size,51", "size,abc"})
    void invalidPaginationReturns400(String key, String value) throws Exception {
        // when & then: 같은 잘못된 입력을 피드와 검색 양쪽에서 거부하는지 확인
        invalid(mockMvc.perform(get(BASE).param(key, value)));
        invalid(mockMvc.perform(get(BASE + "/search").param("q", "공지").param(key, value)));
    }

    @DisplayName("PN-9: 양수가 아니거나 숫자로 변환할 수 없는 공지 ID는 400을 반환한다")
    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "abc", "1.5", "9223372036854775808"})
    void invalidIdReturns400(String id) throws Exception {
        invalid(mockMvc.perform(get(BASE + "/" + id)));
    }

    @DisplayName("PN-10: 비어 있거나 허용하지 않는 카테고리는 400을 반환한다")
    @ParameterizedTest
    @ValueSource(strings = {"", " ", "학과공지", "취업", "MAIN"})
    void invalidCategoryReturns400(String category) throws Exception {
        invalid(mockMvc.perform(get(BASE).param("category", category)));
    }

    @DisplayName("PN-11: 검색어 누락·공백·100자 초과는 거부하고 공백 제거 후 100자는 허용한다")
    @Test
    void missingBlankAndLongSearchReturn400() throws Exception {
        // when & then: 검색어 누락·공백·100자 초과 입력을 거부하는지 확인
        invalid(mockMvc.perform(get(BASE + "/search")));
        for (String keyword : List.of("", " \t ", "가".repeat(101))) {
            invalid(mockMvc.perform(get(BASE + "/search").param("q", keyword)));
        }

        // when & then: 앞뒤 공백을 제거한 뒤 정확히 100자인 검색어는 허용하는지 확인
        mockMvc.perform(get(BASE + "/search").param("q", " " + "가".repeat(100) + " "))
                .andExpect(status().isOk());
    }

    @DisplayName("PN-12: 최대 크기와 큰 페이지 번호는 오버플로 없이 처리한다")
    @Test
    void maximumSizeAndLargePageAreAcceptedWithoutIntegerOverflow() throws Exception {
        mockMvc.perform(get(BASE).param("size", "50").param("page", "2147483647"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @DisplayName("PN-13: 추가 쿼리 파라미터로 공개 조회 범위를 확장할 수 없다")
    @Test
    void extraParametersCannotExpandPublicScope() throws Exception {
        // given: 공통 공지와 학과 공지를 함께 준비
        save("MAIN", "공통 공지", "일반");
        save("DEPARTMENT", "학과 공지", "일반");

        // when & then: 출처·전공·사용자·태그 파라미터를 추가해도 공개 범위가 유지되는지 확인
        mockMvc.perform(get(BASE).param("sourceType", "DEPARTMENT").param("sourceId", "CSIE")
                        .param("major", "CSIE").param("userId", "1").param("tags", "학과"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value("공통 공지"));
        mockMvc.perform(get(BASE + "/search").param("q", "학과").param("sourceType", "DEPARTMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", empty()));
    }

    @DisplayName("PN-14: 비인증 공개 경로의 GET 이외 요청은 401을 반환한다")
    @ParameterizedTest
    @ValueSource(strings = {"POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})
    void nonGetMethodsAreNeverPublic(String method) throws Exception {
        // when & then: 피드·검색·상세 경로 모두에서 비인증 GET 이외 요청을 거부하는지 확인
        for (String path : List.of(BASE, BASE + "/search", BASE + "/1")) {
            mockMvc.perform(request(HttpMethod.valueOf(method), path))
                    .andExpect(status().isUnauthorized());
        }
    }

    @DisplayName("PN-15: 회원 토큰이 있어도 공개 경로의 GET 이외 요청은 403을 반환한다")
    @Test
    void nonGetMethodsAreDeniedEvenWithMemberToken() throws Exception {
        // given: 유효한 회원 토큰을 준비
        String token = memberToken();

        // when & then: 회원 토큰으로도 각 공개 경로의 GET 이외 요청이 거부되는지 확인
        for (String method : List.of("POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")) {
            for (String path : List.of(BASE, BASE + "/search", BASE + "/1")) {
                mockMvc.perform(request(HttpMethod.valueOf(method), path)
                                .header("Authorization", "Bearer " + token))
                        .andExpect(status().isForbidden());
            }
        }
    }

    @DisplayName("PN-16: 회원 전용 조회와 공개 경로의 북마크 요청은 인증이 필요하다")
    @ParameterizedTest
    @ValueSource(strings = {"/api/notices", "/api/notices/search?q=공지", "/api/notices/1",
            "/api/notices/bookmarks", "/api/tags", "/api/notifications", "/api/notifications/unread-exists",
            "/api/public/notices/1/bookmark"})
    void protectedGetRequestsStillRequireAuthentication(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @DisplayName("PN-17: 회원 전용 변경 요청은 인증이 필요하다")
    @Test
    void memberWriteRequestsStillRequireAuthentication() throws Exception {
        // when & then: 북마크·태그·알림·기기 토큰·계정 변경 경로의 비인증 요청을 거부하는지 확인
        mockMvc.perform(post("/api/notices/1/bookmark")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tags")).andExpect(status().isUnauthorized());
        mockMvc.perform(patch("/api/notifications/1/read")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/notifications/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/users/device-token")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/device-token")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/users/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized());
    }

    @DisplayName("PN-18: 회원 토큰으로도 공개 API에서 개인화 정보와 학과 공지를 조회할 수 없다")
    @Test
    void memberJwtCannotExposePersonalizationOrNonMainDataThroughPublicApi() throws Exception {
        // given: 회원 토큰과 북마크한 공통 공지·학과 공지를 준비
        String token = memberToken();
        Notice main = save("MAIN", "공통 공지", "일반");
        Notice department = save("DEPARTMENT", "학과 공지", "학과공지");
        Long userId = users.findByEmail("guest-public-test@catholic.ac.kr").orElseThrow().getId();
        bookmarks.saveAndFlush(Bookmark.create(userId, main.getId()));

        // when & then: 회원 인증으로 공개 피드·검색·상세를 조회해도 개인화 정보와 학과 공지가 노출되지 않는지 확인
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

    @DisplayName("PN-19: 유효하지 않은 JWT도 공개 조회 범위는 유지하고 회원 API는 401을 반환한다")
    @Test
    void invalidAndExpiredJwtKeepPublicScopeWhileMemberApiReturns401() throws Exception {
        // given: 공개·비공개 공지와 만료·위조 토큰을 준비
        Notice main = save("MAIN", "공통 공지", "일반");
        Notice hidden = save("PRIVATE", "비공개 공지", "일반");
        var member = jwtUtil.parseAccessToken(memberToken()).orElseThrow();
        String expired = Jwts.builder().subject(String.valueOf(member.userId()))
                .claim("type", "access").claim("sv", member.sessionVersion())
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signingKey))).compact();
        String forged = Jwts.builder().subject(String.valueOf(member.userId()))
                .claim("type", "access").claim("sv", member.sessionVersion())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(new byte[32])).compact();

        // when & then: 같은 토큰으로 공개 API의 조회 범위와 회원 API의 인증 거부를 함께 확인
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

    @DisplayName("PN-20: 기존 회원 상세는 조회수를 증가시키고 북마크 상태를 반환한다")
    @Test
    void memberDetailStillIncrementsViewCountAndIncludesBookmarkState() throws Exception {
        // given: 회원 토큰과 북마크한 공지의 기존 조회수를 준비
        String token = memberToken();
        Notice notice = save("MAIN", "회원 조회 공지", "일반");
        Long userId = users.findByEmail("guest-public-test@catholic.ac.kr").orElseThrow().getId();
        bookmarks.saveAndFlush(Bookmark.create(userId, notice.getId()));
        long before = notice.getViewCount();

        // when & then: 회원 상세의 북마크 상태와 응답·DB의 조회수 증가를 확인
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
        verifiedEmails.markVerified(VerificationPurpose.SIGNUP, email);
        try {
            authService.register(new RegisterRequest(email, "password123!", "컴퓨터정보공학부", null, 2, "재학"));
        } finally {
            verifiedEmails.remove(VerificationPurpose.SIGNUP, email);
        }
        users.flush();
        var user = users.findByEmail(email).orElseThrow();
        return jwtUtil.generateAccessToken(user.getId(), user.getSessionVersion());
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
