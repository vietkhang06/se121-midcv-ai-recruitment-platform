package com.platform.recruitment.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Object>> handleCustomException(CustomException ex) {
        log.error("CustomException: code={}, message={}", ex.getErrorCode(), ex.getMessage());
        HttpStatus status = switch (ex.getErrorCode()) {
            case RESOURCE_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ACCESS_DENIED, COMPANY_NOT_VERIFIED, EMAIL_NOT_VERIFIED -> HttpStatus.FORBIDDEN;
            case AUTHENTICATION_FAILED -> HttpStatus.UNAUTHORIZED;
            case DUPLICATE_APPLICATION, EMAIL_ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case RATE_LIMIT_EXCEEDED -> HttpStatus.TOO_MANY_REQUESTS;
            case VALIDATION_ERROR, INVALID_FILE, FILE_SIZE_EXCEEDED, TOKEN_EXPIRED, TOKEN_INVALID -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return new ResponseEntity<>(ApiResponse.error(ex.getErrorCode(), ex.getMessage(), ex.getDetails()), status);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolationException caught: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.DUPLICATE_APPLICATION, "Constraint violation or duplicate record detected.", null),
                HttpStatus.CONFLICT
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.error("Validation error: {}", errors);

        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.VALIDATION_ERROR, "Validation failed for request arguments", errors),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(com.platform.recruitment.midcv.ApiFailure.class)
    public ResponseEntity<ApiResponse<Object>> handleApiFailure(com.platform.recruitment.midcv.ApiFailure ex) {
        log.error("ApiFailure: status={}, code={}, message={}", ex.status, ex.code, ex.getMessage());
        ErrorCode ec = switch (ex.status) {
            case 400 -> ErrorCode.VALIDATION_ERROR;
            case 401 -> ErrorCode.AUTHENTICATION_FAILED;
            case 403 -> ErrorCode.ACCESS_DENIED;
            case 404 -> ErrorCode.RESOURCE_NOT_FOUND;
            case 409 -> ErrorCode.DUPLICATE_APPLICATION;
            case 413 -> ErrorCode.FILE_SIZE_EXCEEDED;
            case 422 -> ErrorCode.INVALID_FILE;
            case 429 -> ErrorCode.RATE_LIMIT_EXCEEDED;
            default -> ErrorCode.INTERNAL_SERVER_ERROR;
        };
        return new ResponseEntity<>(ApiResponse.error(ec, ex.getMessage(), ex.code), HttpStatus.valueOf(ex.status));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.", null),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
