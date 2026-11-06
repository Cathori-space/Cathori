package org.cathori.backend.notice.api;

import jakarta.validation.ConstraintViolationException;
import org.cathori.backend.common.exception.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** 공개 API의 입력 오류 처리를 기존 회원 API 계약과 분리한다. */
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = PublicNoticeController.class)
public class PublicNoticeExceptionHandler {

    @ExceptionHandler({
            ConstraintViolationException.class,
            HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class,
            ServletRequestBindingException.class
    })
    public ResponseEntity<ErrorResponse> handleInvalidInput(Exception exception) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("INVALID_INPUT", "공개 공지 조회 입력값이 올바르지 않습니다"));
    }
}
