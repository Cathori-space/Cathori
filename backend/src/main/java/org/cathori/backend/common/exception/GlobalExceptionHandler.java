package org.cathori.backend.common.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        log.warn("BusinessException: code={}, message={}", errorCode.getCode(), errorCode.getMessage());
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ErrorResponse.from(errorCode));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("입력값이 올바르지 않습니다");
        log.warn("Validation failed: {}", message);
        return ResponseEntity
                .badRequest()
                .body(new ErrorResponse("INVALID_INPUT", message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(cv -> cv.getMessage())
                .findFirst()
                .orElse("입력값이 올바르지 않습니다");
        log.warn("ConstraintViolation: {}", message);
        return ResponseEntity
                .badRequest()
                .body(new ErrorResponse("INVALID_INPUT", message));
    }

    // 깨진 JSON, 정의되지 않은 enum 값(예: purpose) 등 본문을 읽지 못한 경우 — 클라이언트 입력 오류다.
    // 원인 메시지에는 입력 토큰(비밀번호 조각일 수 있음)이 그대로 들어가므로 예외 종류만 남긴다.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("Request body not readable: {}", e.getMostSpecificCause().getClass().getSimpleName());
        return ResponseEntity
                .badRequest()
                .body(new ErrorResponse("INVALID_INPUT", "입력값이 올바르지 않습니다"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity
                .internalServerError()
                .body(new ErrorResponse("INTERNAL_ERROR", "서버 내부 오류가 발생했습니다"));
    }
}
