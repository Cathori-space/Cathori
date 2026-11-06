package org.cathori.backend.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 공통 오류 응답 본문.
 *
 * <p>{@code retryAfterSeconds}는 요청 횟수 제한(429)일 때만 채운다. 그 외에는 {@code null}이고
 * JSON에서 아예 빠진다 — 기존 오류 응답은 {@code code}·{@code message} 2필드 그대로 유지된다
 * (스토어에 남은 이전 버전 앱 호환, PRD NF-01).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String code, String message, Long retryAfterSeconds) {

    public ErrorResponse(String code, String message) {
        this(code, message, null);
    }

    public static ErrorResponse from(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.getCode(), errorCode.getMessage());
    }

    public static ErrorResponse rateLimited(ErrorCode errorCode, long retryAfterSeconds) {
        return new ErrorResponse(errorCode.getCode(), errorCode.getMessage(), retryAfterSeconds);
    }
}
