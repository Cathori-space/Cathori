package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * 디바이스 토큰 등록/갱신 요청 바디입니다. (PUT /api/users/device-token)
 *
 * 비어 있으면 Bean Validation이 INVALID_INPUT(400)으로 응답합니다.
 */
public record UpdateDeviceTokenRequest(
        @Schema(example = "fcm_device_token_string")
        @NotBlank
        String deviceToken
) {}
