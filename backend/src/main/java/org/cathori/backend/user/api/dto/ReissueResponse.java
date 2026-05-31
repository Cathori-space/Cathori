package org.cathori.backend.user.api.dto;

public record ReissueResponse(
        String accessToken,
        String refreshToken
) {}
