package org.cathori.backend.notification;

import org.cathori.backend.common.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum AlertErrorCode implements ErrorCode {
    ALERT_NOT_FOUND(HttpStatus.NOT_FOUND, "ALERT_NOT_FOUND", "존재하지 않는 알림이거나 본인의 알림이 아닙니다");

    private final HttpStatus status;
    private final String code;
    private final String message;

    AlertErrorCode(HttpStatus status, String code, String message) {
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
