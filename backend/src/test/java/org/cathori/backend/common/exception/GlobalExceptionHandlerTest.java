package org.cathori.backend.common.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@DisplayName("GlobalExceptionHandler — 오류 응답 구조")
class GlobalExceptionHandlerTest {

    enum TestErrorCode implements ErrorCode {
        NOT_FOUND(HttpStatus.NOT_FOUND, "TEST_NOT_FOUND", "없음"),
        TOO_MANY(HttpStatus.TOO_MANY_REQUESTS, "TEST_TOO_MANY", "잠시 후 다시 시도해 주세요");

        private final HttpStatus status;
        private final String code;
        private final String message;

        TestErrorCode(HttpStatus status, String code, String message) {
            this.status = status;
            this.code = code;
            this.message = message;
        }

        @Override public HttpStatus getStatus() { return status; }
        @Override public String getCode() { return code; }
        @Override public String getMessage() { return message; }
    }

    enum Color { RED }

    record ColorRequest(Color color) { }

    @RestController
    static class TestController {
        @GetMapping("/business")
        void business() {
            throw new BusinessException(TestErrorCode.NOT_FOUND);
        }

        @GetMapping("/rate-limited")
        void rateLimited() {
            throw new RateLimitedException(TestErrorCode.TOO_MANY, Duration.ofMillis(41_200));
        }

        @PostMapping("/color")
        void color(@RequestBody ColorRequest request) { }
    }

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private List<String> jsonKeys(MvcResult result) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.propertyNames().stream().toList();
    }

    @Test
    @DisplayName("일반 BusinessException 응답은 code·message 2필드 그대로다 (이전 버전 앱 호환)")
    void businessExceptionKeepsTwoFields() throws Exception {
        // given — BusinessException을 던지는 엔드포인트

        // when
        MvcResult result = mockMvc.perform(get("/business"))
                .andExpect(status().isNotFound())
                .andExpect(header().doesNotExist("Retry-After"))
                .andReturn();

        // then
        assertThat(jsonKeys(result)).containsExactlyInAnyOrder("code", "message");
    }

    @Test
    @DisplayName("RateLimitedException은 429 + Retry-After 헤더 + retryAfterSeconds(올림한 초)")
    void rateLimitedIncludesRetryAfter() throws Exception {
        // given — 41.2초 남은 제한

        // when — 42초로 올림
        MvcResult result = mockMvc.perform(get("/rate-limited"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "42"))
                .andExpect(jsonPath("$.code").value("TEST_TOO_MANY"))
                .andExpect(jsonPath("$.retryAfterSeconds").value(42))
                .andReturn();

        // then — 429에서만 retryAfterSeconds가 추가된다
        assertThat(jsonKeys(result)).containsExactlyInAnyOrder("code", "message", "retryAfterSeconds");
    }

    @Test
    @DisplayName("정의되지 않은 enum 값 등 본문 파싱 실패는 500이 아니라 400 INVALID_INPUT")
    void unreadableBodyIsBadRequest() throws Exception {
        // given
        String body = "{\"color\":\"PURPLE\"}";

        // when
        MvcResult result = mockMvc.perform(post("/color")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andReturn();

        // then
        assertThat(jsonKeys(result)).containsExactlyInAnyOrder("code", "message");
    }
}
