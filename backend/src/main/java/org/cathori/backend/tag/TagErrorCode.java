package org.cathori.backend.tag;

import org.cathori.backend.common.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TagErrorCode implements ErrorCode {

    TAG_DUPLICATE(HttpStatus.CONFLICT, "TAG_DUPLICATE", "이미 존재하는 태그입니다"),
    TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "TAG_NOT_FOUND", "태그를 찾을 수 없습니다"),
    TAG_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "TAG_LIMIT_EXCEEDED", "태그 개수 한도를 초과했습니다");


    private final HttpStatus status;
    private final String code;
    private final String message;

    TagErrorCode(HttpStatus status, String code, String message) {
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
