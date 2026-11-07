package org.cathori.backend.user.api.dto;

import org.cathori.backend.user.application.email.VerificationPurpose;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("이메일 인증 요청 purpose 기본값 — 1.0.1 앱 호환 (NF-01)")
class EmailRequestPurposeDefaultTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("purpose 필드가 없는 구버전 요청 본문은 SIGNUP으로 처리된다")
    void missingPurposeDefaultsToSignup() {
        // given — 1.0.1 앱이 보내는 본문 (purpose 없음)
        String sendBody = "{\"email\":\"a@catholic.ac.kr\"}";
        String verifyBody = "{\"email\":\"a@catholic.ac.kr\",\"code\":\"123456\"}";

        // when
        EmailSendRequest send = mapper.readValue(sendBody, EmailSendRequest.class);
        EmailVerifyRequest verify = mapper.readValue(verifyBody, EmailVerifyRequest.class);

        // then
        assertThat(send.purpose()).isEqualTo(VerificationPurpose.SIGNUP);
        assertThat(verify.purpose()).isEqualTo(VerificationPurpose.SIGNUP);
    }

    @Test
    @DisplayName("purpose를 명시하면 그대로 쓴다")
    void explicitPurposeIsKept() {
        // given
        String body = "{\"email\":\"a@catholic.ac.kr\",\"purpose\":\"PASSWORD_RESET\"}";

        // when
        EmailSendRequest send = mapper.readValue(body, EmailSendRequest.class);

        // then
        assertThat(send.purpose()).isEqualTo(VerificationPurpose.PASSWORD_RESET);
    }
}
