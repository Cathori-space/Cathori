package org.cathori.backend.user;

import org.cathori.backend.common.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum UserErrorCode implements ErrorCode {
    USER_EMAIL_DUPLICATE(HttpStatus.CONFLICT, "USER_EMAIL_DUPLICATE", "이미 사용중인 이메일입니다"),
    USER_INVALID_VERIFY_CODE(HttpStatus.BAD_REQUEST, "USER_INVALID_VERIFY_CODE", "인증번호가 올바르지 않습니다"),
    USER_VERIFY_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "USER_VERIFY_CODE_EXPIRED", "인증번호가 만료되었습니다"),
    USER_NOT_VERIFIED(HttpStatus.FORBIDDEN, "USER_NOT_VERIFIED", "이메일 인증이 완료되지 않았습니다"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "존재하지 않는 사용자입니다"),
    USER_INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "USER_INVALID_PASSWORD", "비밀번호가 올바르지 않습니다"),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_INVALID", "유효하지 않거나 만료된 리프레시 토큰입니다");

    private final HttpStatus status;
    private final String code;
    private final String message;

    UserErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
