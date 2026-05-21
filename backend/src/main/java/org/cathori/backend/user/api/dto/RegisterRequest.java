package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @Schema(example = "user256@catholic.ac.kr")
        @NotBlank(message = "이메일을 입력해 주세요")
        @Email(message = "이메일 형식이 올바르지 않습니다")
        String email,

        @Schema(example = "password123!")
        @NotBlank(message = "비밀번호를 입력해 주세요")
        String password,

        @Schema(example = "컴퓨터정보공학부")
        @NotBlank(message = "전공을 입력해 주세요")
        String major1,

        @Schema(example = "수학과")
        String major2,

        @Schema(example = "2")
        @Min(value = 1, message = "학년은 1 이상이어야 합니다")
        @Max(value = 4, message = "학년은 4 이하이어야 합니다")
        int grade,

        @Schema(example = "재학")
        @NotBlank(message = "재학 상태를 입력해 주세요")
        String status
) {}