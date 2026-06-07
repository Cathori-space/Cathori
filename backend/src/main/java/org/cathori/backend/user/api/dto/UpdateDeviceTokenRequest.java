package org.cathori.backend.user.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record UpdateDeviceTokenRequest(
        @Schema(example = "fcm-device-token")
        @NotBlank String deviceToken
) {}
