package org.cathori.backend.tag.api;

import org.cathori.backend.IntegrationTestBase;
import org.cathori.backend.security.JwtUtil;
import org.cathori.backend.tag.api.dto.CreateTagRequest;
import org.cathori.backend.tag.application.TagService;
import org.cathori.backend.tag.infra.TagJpaRepository;
import org.cathori.backend.user.application.AuthService;
import org.cathori.backend.user.application.NotificationPort;
import org.cathori.backend.user.application.VerifiedEmailStore;
import org.cathori.backend.user.api.dto.RegisterRequest;
import org.cathori.backend.user.infra.UserJpaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Tag 통합 테스트")
class TagIntegrationTest extends IntegrationTestBase {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired AuthService authService;
    @Autowired VerifiedEmailStore verifiedEmailStore;
    @Autowired UserJpaRepository userJpaRepository;
    @Autowired TagJpaRepository tagJpaRepository;
    @Autowired TagService tagService;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean NotificationPort notificationPort;

    private static final String EMAIL_A = "tagtest_a@catholic.ac.kr";
    private static final String EMAIL_B = "tagtest_b@catholic.ac.kr";
    private static final String PASSWORD = "password123!";
    private static final String MAJOR = "컴퓨터공학과";

    private Long userAId;
    private Long userBId;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        verifiedEmailStore.markVerified(EMAIL_A);
        authService.register(new RegisterRequest(EMAIL_A, PASSWORD, MAJOR, null, 2, "재학"));
        userAId = userJpaRepository.findByEmail(EMAIL_A).orElseThrow().getId();
        tokenA = jwtUtil.generateAccessToken(userAId);

        verifiedEmailStore.markVerified(EMAIL_B);
        authService.register(new RegisterRequest(EMAIL_B, PASSWORD, MAJOR, null, 2, "재학"));
        userBId = userJpaRepository.findByEmail(EMAIL_B).orElseThrow().getId();
        tokenB = jwtUtil.generateAccessToken(userBId);
    }

    @AfterEach
    void cleanup() {
        tagJpaRepository.deleteAll();
        userJpaRepository.findByEmail(EMAIL_A).ifPresent(userJpaRepository::delete);
        userJpaRepository.findByEmail(EMAIL_B).ifPresent(userJpaRepository::delete);
        verifiedEmailStore.remove(EMAIL_A);
        verifiedEmailStore.remove(EMAIL_B);
    }

    @Test
    @DisplayName("T-1: 태그 생성 성공 시 201과 tagId/tagName 반환")
    void createTag_success() throws Exception {
        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("개발"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tagId").isNumber())
                .andExpect(jsonPath("$.tagName").value("개발"));
    }

    @Test
    @DisplayName("T-2: 인증 없이 태그 생성 요청 시 401 반환")
    void createTag_unauthorized() throws Exception {
        mockMvc.perform(post("/api/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("개발"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T-3: 유효하지 않은 tagName 입력 시 400 반환")
    void createTag_invalidTagName() throws Exception {
        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("invalid!"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("a".repeat(21)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("T-4: 동일 유저가 중복 태그 생성 시 409 TAG_DUPLICATE 반환")
    void createTag_duplicate() throws Exception {
        tagService.createTag(userAId, "개발");

        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("개발"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TAG_DUPLICATE"));
    }

    @Test
    @DisplayName("T-5: 태그 20개 보유 상태에서 추가 시 400 TAG_LIMIT_EXCEEDED 반환")
    void createTag_limitExceeded() throws Exception {
        for (int i = 1; i <= 20; i++) {
            tagService.createTag(userAId, "태그" + i);
        }

        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("태그21"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TAG_LIMIT_EXCEEDED"));
    }

    @Test
    @DisplayName("T-6: 다른 유저가 동일 태그명 생성 시 201 반환 (유저 간 격리)")
    void createTag_differentUser_sameTagName() throws Exception {
        tagService.createTag(userAId, "개발");

        mockMvc.perform(post("/api/tags")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateTagRequest("개발"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tagName").value("개발"));
    }

    @Test
    @DisplayName("T-7: 본인 태그 삭제 성공 시 200 반환")
    void deleteTag_success() throws Exception {
        var tag = tagService.createTag(userAId, "개발");

        mockMvc.perform(delete("/api/tags/" + tag.tagId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("T-8: 존재하지 않는 tagId 삭제 시 404 TAG_NOT_FOUND 반환")
    void deleteTag_notFound() throws Exception {
        mockMvc.perform(delete("/api/tags/99999")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TAG_NOT_FOUND"));
    }

    @Test
    @DisplayName("T-9: 다른 유저의 태그 삭제 시도 시 404 TAG_NOT_FOUND 반환")
    void deleteTag_otherUser() throws Exception {
        var tag = tagService.createTag(userAId, "개발");

        mockMvc.perform(delete("/api/tags/" + tag.tagId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TAG_NOT_FOUND"));
    }
}