package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.cathori.backend.user.application.email.VerificationPurpose;

public record EmailVerifyRequest(
        @Schema(example = "user256@catholic.ac.kr")
        @NotBlank(message = "이메일을 입력해 주세요")
        @Email(message = "이메일 형식이 올바르지 않습니다")
        String email,

        @Schema(example = "482917")
        @NotBlank(message = "인증번호를 입력해 주세요")
        String code,

        @Schema(description = "인증 목적. 생략하면 SIGNUP", example = "SIGNUP",
                defaultValue = "SIGNUP")
        VerificationPurpose purpose
) {
    /** 1.0.1 앱 호환 — {@link EmailSendRequest}와 같은 이유로 여기서 보정한다 (NF-01). */
    public EmailVerifyRequest {
        purpose = purpose != null ? purpose : VerificationPurpose.SIGNUP;
    }
}
