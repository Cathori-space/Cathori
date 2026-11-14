package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.cathori.backend.user.application.email.VerificationPurpose;

public record EmailSendRequest(
        @Schema(example = "user256@catholic.ac.kr")
        @NotBlank(message = "이메일을 입력해 주세요")
        @Email(message = "이메일 형식이 올바르지 않습니다")
        String email,

        @Schema(description = "인증 목적. 생략하면 SIGNUP", example = "SIGNUP",
                defaultValue = "SIGNUP")
        VerificationPurpose purpose
) {
    /**
     * 스토어에 남은 1.0.1 앱은 {@code purpose}를 보내지 않는다 (NF-01).
     * 보정을 컨트롤러에 두면 새 엔드포인트에서 빠뜨릴 수 있으므로,
     * 역직렬화 시점에 한 번만 메운다 — 이후 {@code purpose()}는 절대 null이 아니다.
     */
    public EmailSendRequest {
        purpose = purpose != null ? purpose : VerificationPurpose.SIGNUP;
    }
}
