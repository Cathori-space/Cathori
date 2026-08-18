package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Schema(example = "user256@catholic.ac.kr") @Email @NotBlank String email,
        @Schema(example = "password123!") @NotBlank String password
) {}