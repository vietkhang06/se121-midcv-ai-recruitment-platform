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
            case ACCESS_DENIED, COMPANY_NOT_VERIFIED -> HttpStatus.FORBIDDEN;
            case AUTHENTICATION_FAILED -> HttpStatus.UNAUTHORIZED;
            case DUPLICATE_APPLICATION -> HttpStatus.CONFLICT;
            case VALIDATION_ERROR, INVALID_FILE, FILE_SIZE_EXCEEDED -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return new ResponseEntity<>(ApiResponse.error(ex.getErrorCode(), ex.getMessage(), ex.getDetails()), status);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolationException caught: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.DUPLICATE_APPLICATION, "Candidate has already submitted an application for this job.", null),
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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.", null),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
