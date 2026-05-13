package org.cathori.backend.user.api.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String email,
        String major,
        String secondMajor,
        int grade,
        String enrollmentStatus,
        List<TagDto> tags
) {}
